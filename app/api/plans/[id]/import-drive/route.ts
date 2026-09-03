import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { putUpload, isWebPlayableVideo } from "@/lib/uploads";
import { DriveFolderSource, parseDriveFolderId } from "@/lib/sources/drive-folder";
import type { NewAsset } from "@/lib/data/store";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Pull every media file from this plan's shoot Drive folder into the plan's assets. */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return json({ error: "GOOGLE_API_KEY tanımlı değil" }, 400);

  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);

  const folderId = plan.driveFolderUrl ? parseDriveFolderId(plan.driveFolderUrl) : null;
  if (!folderId) {
    return json({ error: "planın Drive klasör linki ayarlı değil" }, 400);
  }

  let listed;
  try {
    listed = await new DriveFolderSource(folderId, apiKey).list();
  } catch (e) {
    return json({ error: `Drive listelenemedi: ${(e as Error).message}` }, 502);
  }

  const key = (a: { name: string; slideGroup?: string | null }) => `${a.slideGroup ?? ""}::${a.name}`;
  const have = new Set((await store.listAssets(id)).map(key));
  const fresh = listed.filter((a) => !have.has(key(a)));

  const staged: NewAsset[] = [];
  const failed: { name: string; reason: string }[] = [];

  for (const a of fresh) {
    try {
      const res = await fetch(a.url);
      if (!res.ok) throw new Error(`indirilemedi (${res.status})`);
      const bytes = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "application/octet-stream";
      const { url } = await putUpload({ name: a.name, contentType, bytes });
      staged.push({
        type: a.type,
        kind: a.kind,
        url,
        name: a.name,
        slideGroup: a.slideGroup ?? null,
        slideOrder: a.slideOrder,
        ...(a.kind === "video" ? { webPlayable: isWebPlayableVideo(a.name) } : {}),
      });
    } catch (e) {
      failed.push({ name: a.name, reason: (e as Error).message });
    }
  }

  if (staged.length) await store.addAssets(id, staged);
  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "drive_iceri_aktarildi",
    meta: { imported: staged.length, skipped: listed.length - fresh.length, failed: failed.length },
  });

  return json({
    imported: staged.length,
    skipped: listed.length - fresh.length,
    failed,
  });
}
