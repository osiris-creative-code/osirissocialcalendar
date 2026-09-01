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

  const imageUrls =
    brand.feedThumbs && brand.feedThumbs.length > 0
      ? brand.feedThumbs
      : brand.feedScreenshotUrl
        ? [brand.feedScreenshotUrl]
        : [];

  if (imageUrls.length === 0) {
    return json({
      insights: [
        "Analiz için önce feed'i otomatik çekin ya da güncel Instagram feed'inin bir ekran görüntüsünü yükleyin.",
      ],
      needsScreenshot: true,
    });
  }

  const { insights } = await getAI().analyzeFeed({
    brandName: brand.name,
    handle: brand.instagramHandle,
    imageUrls,
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
