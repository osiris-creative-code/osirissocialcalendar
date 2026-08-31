import { getStore } from "@/lib/db";
import { getAI } from "@/lib/ai";
import { json, requireEditor } from "@/lib/api/session";

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

  if (!brand.feedScreenshotUrl) {
    return json({
      insights: [
        "Analiz için önce markanın güncel Instagram feed'inin bir ekran görüntüsünü yükleyin.",
        "(Instagram'ın kendi bağlantısı Phase 2'de gelecek.)",
      ],
      needsScreenshot: true,
    });
  }

  const { insights } = await getAI().analyzeFeed({
    brandName: brand.name,
    handle: brand.instagramHandle,
    imageUrls: [brand.feedScreenshotUrl],
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
