import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { previewGenerate, runGenerate } from "@/lib/generate";

export const maxDuration = 30;

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

  // No mode = cheap preview (counts + gap), zero AI calls.
  if (!body.mode) {
    const p = await previewGenerate(plan);
    return json({
      ruleCount: p.ruleCount,
      gap: p.gap,
      usingRealAssets: p.usingRealAssets,
      preview: { extendCount: p.extendCount, stopCount: p.stopCount },
    });
  }

  // With mode = build the chosen set (one AI call) and persist.
  const { items, gap } = await runGenerate(plan, brand, body.mode);
  await store.replaceItems(id, items);
  await store.updatePlan(id, { version: plan.version + 1 });
  await store.snapshotPlan(id, "AI üretimi", actor.name);
  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "takvim_uretildi",
    meta: { mode: body.mode, count: items.length, gap },
  });

  return json({ items: await store.listItems(id), gap });
}
