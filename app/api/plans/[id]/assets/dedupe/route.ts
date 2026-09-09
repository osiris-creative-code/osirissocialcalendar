import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { deleteUploads } from "@/lib/uploads";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Removes duplicate assets left behind by an import that ran more than once
 * (a race, a retry after a timeout). Keeps the earliest copy of each
 * slideGroup+name, deletes the rest and their Storage files.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const actor = requireEditor(_req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const assets = await store.listAssets(id); // sorted by `sort`, so first seen = earliest

  const kept = new Set<string>();
  const removeIds: string[] = [];
  const removeUrls: string[] = [];
  for (const a of assets) {
    const k = `${a.slideGroup ?? ""}::${a.name}`;
    if (kept.has(k)) {
      removeIds.push(a.id);
      if (a.url) removeUrls.push(a.url);
    } else {
      kept.add(k);
    }
  }

  for (const assetId of removeIds) await store.deleteAsset(assetId);
  if (removeUrls.length) await deleteUploads(removeUrls);

  if (removeIds.length) {
    await store.logActivity({
      planId: id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "yinelenenler_temizlendi",
      meta: { removed: removeIds.length },
    });
  }

  return json({ removed: removeIds.length, kept: kept.size });
}
