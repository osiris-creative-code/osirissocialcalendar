import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { runGenerate } from "@/lib/generate";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);
  const brand = await store.getBrand(plan.brandId);
  if (!brand) return json({ error: "brand not found" }, 404);

  const body = (await req.json().catch(() => ({}))) as { mode?: "extend" | "stopAtAssets" };
  const out = await runGenerate(plan, brand);

  if (!body.mode) {
    return json({
      ruleCount: out.ruleCount,
      gap: out.gap,
      preview: { extendCount: out.extendItems.length, stopCount: out.stopItems.length },
    });
  }

  const chosen = body.mode === "stopAtAssets" ? out.stopItems : out.extendItems;
  await store.replaceItems(id, chosen);
  await store.updatePlan(id, { version: plan.version + 1 });
  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "takvim_uretildi",
    meta: { mode: body.mode, count: chosen.length, gap: out.gap },
  });

  const items = await store.listItems(id);
  return json({ items, gap: out.gap });
}
