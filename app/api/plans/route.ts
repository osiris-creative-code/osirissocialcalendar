import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";

export async function POST(req: Request) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const body = (await req.json().catch(() => null)) as
    | {
        brandId?: string;
        title?: string;
        rangeStart?: string;
        rangeEnd?: string;
        prompt?: string;
        driveFolderUrl?: string;
        reelLinks?: string[];
      }
    | null;
  if (!body?.brandId || !body.title?.trim()) {
    return json({ error: "brandId, title required" }, 400);
  }

  const store = getStore();
  const brand = await store.getBrand(body.brandId);
  if (!brand) return json({ error: "brand not found" }, 404);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  const rangeStart = /^\d{4}-\d{2}-\d{2}$/.test(body.rangeStart ?? "")
    ? body.rangeStart!
    : iso(today);
  const rangeEnd = /^\d{4}-\d{2}-\d{2}$/.test(body.rangeEnd ?? "")
    ? body.rangeEnd!
    : iso(new Date(today.getTime() + 13 * 86400000));

  const plan = await store.createPlan({
    brandId: brand.id,
    title: body.title.trim(),
    rangeStart,
    rangeEnd,
    prompt: body.prompt ?? "",
    theme: { primary: brand.colorPrimary, accent: brand.colorAccent },
    driveFolderUrl: body.driveFolderUrl,
    reelLinks: Array.isArray(body.reelLinks)
      ? body.reelLinks.map((s) => String(s).trim()).filter(Boolean)
      : [],
  });
  await store.logActivity({
    planId: plan.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "plan_olusturuldu",
    meta: { title: plan.title },
  });
  return json(plan);
}
