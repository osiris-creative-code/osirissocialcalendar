import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { deleteUploads, isWebPlayableVideo } from "@/lib/uploads";
import { slideOrderFromName } from "@/lib/sources/slide-order";
import { ITEM_TYPES, type ItemType } from "@/lib/types";
import type { NewAsset } from "@/lib/data/store";

type Ctx = { params: Promise<{ id: string }> };

type IncomingAsset = {
  type: ItemType;
  kind: "image" | "video";
  url: string;
  name: string;
  placeholder?: boolean;
  posterUrl?: string;
};

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return json(await getStore().listAssets(id));
}

/** Records already-uploaded files (browser PUT them straight to storage first). */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  if (!(await store.getPlan(id))) return json({ error: "plan not found" }, 404);

  const body = (await req.json().catch(() => null)) as { items?: IncomingAsset[] } | null;
  const incoming = body?.items ?? [];
  if (incoming.length === 0) return json({ error: "items required" }, 400);

  const staged: NewAsset[] = incoming.map((a) => {
    if (!(ITEM_TYPES as readonly string[]).includes(a.type)) throw new Error("bad type");
    const order = slideOrderFromName(a.name);
    const carousel = order != null && a.type !== "story" && a.type !== "reel";
    const kind = a.kind === "video" ? "video" : "image";
    return {
      type: a.type,
      kind,
      url: a.url,
      name: a.name,
      slideGroup: carousel
        ? a.name.replace(/[_\s-]?\d+\s*\.[a-z0-9]+$/i, "").trim() || "grup"
        : null,
      slideOrder: order ?? 1,
      placeholder: a.placeholder === true,
      ...(kind === "video" ? { webPlayable: isWebPlayableVideo(a.name) } : {}),
      ...(a.posterUrl ? { posterUrl: a.posterUrl } : {}),
    };
  });

  const created = await store.addAssets(id, staged);
  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "icerik_yuklendi",
    meta: { count: created.length },
  });
  return json(created);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const assetId = new URL(req.url).searchParams.get("assetId");
  if (!assetId) return json({ error: "assetId required" }, 400);
  const { id } = await ctx.params;
  const store = getStore();
  const asset = (await store.listAssets(id)).find((a) => a.id === assetId);
  await store.deleteAsset(assetId);
  if (asset?.url) await deleteUploads([asset.url]);
  return new Response(null, { status: 204 });
}
