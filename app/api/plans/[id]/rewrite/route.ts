import { getStore } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { json, requireEditor } from "@/lib/api/session";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { itemId?: string; instruction?: string }
    | null;
  if (!body?.itemId) return json({ error: "itemId required" }, 400);

  const store = getStore();
  const [plan, items] = await Promise.all([store.getPlan(id), store.listItems(id)]);
  if (!plan) return json({ error: "plan not found" }, 404);
  const item = items.find((i) => i.id === body.itemId);
  if (!item) return json({ error: "item not found" }, 404);
  if (item.type === "story") return json({ error: "story öğesinin açıklaması yok" }, 400);
  const brand = await store.getBrand(plan.brandId);
  if (!brand) return json({ error: "brand not found" }, 404);

  const { caption } = await getAI().rewriteCaption({
    brandName: brand.name,
    tone: "sıcak",
    type: item.type,
    current: item.caption ?? "",
    instruction: body.instruction?.trim() || undefined,
    imageUrl: item.media[0]?.url ?? null,
    vision: plan.visionEnabled,
    feedInsights: plan.feedInsights,
  });

  const updated = await store.updateItem(item.id, { caption });
  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "caption_yeniden_yazildi",
    meta: { itemId: item.id, instruction: body.instruction ?? null },
  });
  return json(updated);
}
