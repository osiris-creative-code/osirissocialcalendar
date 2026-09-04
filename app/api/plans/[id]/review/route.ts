import { getStore } from "@/lib/db";
import { json } from "@/lib/api/session";
import { getAI } from "@/lib/ai";
import { captionLanguageOf } from "@/lib/caption-language";
import { calendarFacts } from "@/lib/analyze/review";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * The pass before internal approval: arithmetic findings are computed here,
 * the model only prioritises and phrases them.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = getStore();
  const [plan, items] = await Promise.all([store.getPlan(id), store.listItems(id)]);
  if (!plan) return json({ error: "plan not found" }, 404);
  if (items.length === 0) return json({ notes: [], note: "Önce takvimi üret." });
  const brand = await store.getBrand(plan.brandId);
  if (!brand) return json({ error: "brand not found" }, 404);

  const facts = calendarFacts(items, plan.rangeStart, plan.rangeEnd);
  if (facts.length === 0) return json({ notes: [] });

  try {
    const { notes } = await getAI().reviewCalendar({
      brandName: brand.name,
      rangeStart: plan.rangeStart,
      rangeEnd: plan.rangeEnd,
      items: items.map((i) => ({ date: i.date, type: i.type, caption: i.caption })),
      facts,
      language: captionLanguageOf(brand),
    });
    return json({ notes });
  } catch (e) {
    return json({ error: `Tavsiye alınamadı: ${(e as Error).message}` }, 502);
  }
}
