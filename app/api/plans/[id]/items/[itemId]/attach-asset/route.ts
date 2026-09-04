import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/**
 * Points an already-generated item at one of the plan's uploaded assets —
 * filling an empty gap, or replacing whatever media the item currently has.
 * Works at any plan stage: a revision can ask for a different photo, or a
 * video that wasn't ready at "Takvimi üret" time can show up days later.
 */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id, itemId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { assetId?: string } | null;
  if (!body?.assetId) return json({ error: "assetId required" }, 400);

  const store = getStore();
  const [items, assets] = await Promise.all([store.listItems(id), store.listAssets(id)]);
  const item = items.find((i) => i.id === itemId);
  if (!item) return json({ error: "item not found" }, 404);
  const asset = assets.find((a) => a.id === body.assetId);
  if (!asset) return json({ error: "asset not found" }, 404);
  if (asset.type !== item.type) {
    return json({ error: `bu öğe ${item.type} bekliyor, seçilen içerik ${asset.type}` }, 400);
  }

  const updated = await store.updateItem(itemId, {
    isGap: false,
    placeholder: false,
    media: [
      {
        url: asset.url,
        kind: asset.kind,
        slideOrder: 1,
        ...(asset.posterUrl ? { posterUrl: asset.posterUrl } : {}),
        ...(asset.webPlayable === false ? { webPlayable: false } : {}),
        ...(asset.driveEmbed ? { driveEmbed: true } : {}),
      },
    ],
  });

  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "gorsel_degistirildi",
    meta: { itemId, assetId: asset.id },
  });

  return json(updated);
}
