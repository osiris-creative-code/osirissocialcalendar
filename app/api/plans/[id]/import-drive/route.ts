import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { putUpload, isWebPlayableVideo } from "@/lib/uploads";
import {
  DriveFolderSource,
  parseDriveFolderId,
  parseDriveFileId,
  driveDownloadUrl,
} from "@/lib/sources/drive-folder";
import type { Asset } from "@/lib/sources/types";
import type { NewAsset } from "@/lib/data/store";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Pull media from this plan's shoot Drive folder + separate reels links into the plan's assets. */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return json({ error: "GOOGLE_API_KEY tanımlı değil (Vercel ortam değişkeni)" }, 400);

    const { id } = await ctx.params;
    const store = getStore();
    const plan = await store.getPlan(id);
    if (!plan) return json({ error: "plan not found" }, 404);

    const folderId = plan.driveFolderUrl ? parseDriveFolderId(plan.driveFolderUrl) : null;
    const reelLinks = (plan.reelLinks ?? []).map((s) => s.trim()).filter(Boolean);
    if (!folderId && reelLinks.length === 0) {
      return json({ error: "planda Drive klasör linki ya da reels linki yok" }, 400);
    }

    // 1) walk the shoot folder
    let listed: Asset[] = [];
    if (folderId) {
      try {
        listed = await new DriveFolderSource(folderId, apiKey).list();
      } catch (e) {
        return json(
          {
            error:
              `Drive klasörü okunamadı: ${(e as Error).message}. ` +
              `Klasör "bağlantısı olan herkes"e açık mı, link doğru mu?`,
          },
          502,
        );
      }
      if (listed.length === 0) {
        return json({
          imported: 0,
          skipped: 0,
          failed: [],
          note: "Klasörde POST / STORY / REELS alt klasörü ya da görsel bulunamadı.",
        });
      }
    }

    // 2) reels delivered as separate Drive file links
    const reelAssets: Asset[] = [];
    const linkFailed: { name: string; reason: string }[] = [];
    reelLinks.forEach((link, i) => {
      const fileId = parseDriveFileId(link);
      if (!fileId) {
        linkFailed.push({ name: link.slice(0, 60), reason: "Google Drive dosya linki değil" });
        return;
      }
      reelAssets.push({
        id: fileId,
        name: `reels-link-${i + 1}.mp4`,
        type: "reel",
        kind: "video",
        url: driveDownloadUrl(fileId, apiKey),
        slideOrder: 1,
      });
    });

    const all = [...listed, ...reelAssets];
    const key = (a: { name: string; slideGroup?: string | null }) => `${a.slideGroup ?? ""}::${a.name}`;
    const have = new Set((await store.listAssets(id)).map(key));
    const fresh = all.filter((a) => !have.has(key(a)));

    const staged: NewAsset[] = [];
    const failed = [...linkFailed];

    for (const a of fresh) {
      try {
        const res = await fetch(a.url);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`indirilemedi ${res.status} ${body.slice(0, 120)}`);
        }
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
      meta: { imported: staged.length, skipped: all.length - fresh.length, failed: failed.length },
    });

    return json({ imported: staged.length, skipped: all.length - fresh.length, failed });
  } catch (e) {
    return json({ error: `beklenmeyen hata: ${(e as Error).message}` }, 500);
  }
}
