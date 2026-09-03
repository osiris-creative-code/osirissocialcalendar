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
      }
    | null;
  if (!body?.brandId || !body.title?.trim() || !body.rangeStart || !body.rangeEnd) {
    return json({ error: "brandId, title, rangeStart, rangeEnd required" }, 400);
  }

  const store = getStore();
  const brand = await store.getBrand(body.brandId);
  if (!brand) return json({ error: "brand not found" }, 404);

  const plan = await store.createPlan({
    brandId: brand.id,
    title: body.title.trim(),
    rangeStart: body.rangeStart,
    rangeEnd: body.rangeEnd,
    prompt: body.prompt ?? "",
    theme: { primary: brand.colorPrimary, accent: brand.colorAccent },
    driveFolderUrl: body.driveFolderUrl,
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
