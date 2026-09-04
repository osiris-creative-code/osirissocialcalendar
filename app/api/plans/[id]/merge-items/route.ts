import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { mergePostItems } from "@/lib/planner/reorder";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Manual "make these already-generated posts a carousel" — the same operation
 * merge-carousel does on raw assets before generation, done here on PlanItems
 * after generation. Existing feedback on the items that get merged away moves
 * to the surviving item instead of being orphaned.
 */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { itemIds?: string[] } | null;
  const itemIds = body?.itemIds?.filter((x) => typeof x === "string") ?? [];
  if (itemIds.length < 2) return json({ error: "en az 2 gönderi gerekli" }, 400);

  const store = getStore();
  const items = await store.listItems(id);
  const chosen = items.filter((i) => itemIds.includes(i.id));
  if (chosen.length !== itemIds.length) return json({ error: "item not found" }, 404);

  // Instagram has no carousel for Story or Reels, and an empty gap slot has no
  // media to merge.
  if (chosen.some((i) => i.type !== "post")) {
    return json({ error: "sadece post içerikleri kaydırmalı yapılabilir" }, 400);
  }
  if (chosen.some((i) => i.isGap)) {
    return json({ error: "içeriği eksik bir öğe kaydırmalıya eklenemez" }, 400);
  }

  const merged = mergePostItems(items, itemIds);
  const keptId = merged.find((i) => itemIds.includes(i.id))!.id;
  await Promise.all(
    itemIds.filter((iid) => iid !== keptId).map((iid) => store.reassignItemFeedback(iid, keptId)),
  );

  await store.replaceItems(id, merged);
  return json({ items: await store.listItems(id) });
}
