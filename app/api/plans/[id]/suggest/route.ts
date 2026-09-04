import { getStore } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { json, requireEditor } from "@/lib/api/session";
import { shootCounts, daySpan, cadenceBrief } from "@/lib/planner/suggest";

export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

/** Looks at the plan's uploaded/pulled content and proposes a prompt. Does NOT apply it. */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);
  const brand = await store.getBrand(plan.brandId);
  if (!brand) return json({ error: "brand not found" }, 404);

  const assets = await store.listAssets(id);
  const counts = shootCounts(assets);
  const days = daySpan(plan.rangeStart, plan.rangeEnd);
  const brief = cadenceBrief(days, counts);

  const imageUrls = assets
    .filter((a) => !a.placeholder && a.kind === "image" && /^https?:\/\//.test(a.url))
    .slice(0, 8)
    .map((a) => a.url);

  const { prompt, note } = await getAI().suggestPlan({
    brandName: brand.name,
    rangeStart: plan.rangeStart,
    rangeEnd: plan.rangeEnd,
    counts,
    cadenceBrief: brief,
    imageUrls,
  });

  return json({ prompt, note, counts });
}
