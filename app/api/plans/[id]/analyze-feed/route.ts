import { getStore } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { json, requireEditor } from "@/lib/api/session";

type Ctx = { params: Promise<{ id: string }> };

// Phase 1: no real feed images. Phase 2 swaps this for the brand's fetched media.
const DEMO_FEED = Array.from({ length: 9 }, (_, i) => `/demo/ph-${(i % 5) + 1}.svg`);

export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);
  const brand = await store.getBrand(plan.brandId);
  if (!brand) return json({ error: "brand not found" }, 404);

  const { insights } = await getAI().analyzeFeed({
    brandName: brand.name,
    handle: brand.instagramHandle,
    imageUrls: DEMO_FEED,
  });

  await store.updatePlan(id, { feedInsights: insights });
  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "feed_analiz_edildi",
    meta: { count: insights.length },
  });
  return json({ insights });
}
