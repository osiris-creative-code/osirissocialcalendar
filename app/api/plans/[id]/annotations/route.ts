import { getStore } from "@/lib/db";
import { json } from "@/lib/api/session";
import { zAnnotation } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return json(await getStore().listAnnotations(id));
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const raw = (await req.json().catch(() => null)) as { itemId?: string; [k: string]: unknown } | null;
  if (!raw?.itemId) return json({ error: "itemId required" }, 400);

  const parsed = zAnnotation.safeParse({ ...raw, planItemId: raw.itemId });
  if (!parsed.success) return json({ error: "invalid annotation", detail: parsed.error.issues }, 400);

  const store = getStore();
  const annotation = await store.addAnnotation(parsed.data);
  await store.logActivity({
    planId: id,
    actorName: parsed.data.authorName,
    actorRole: parsed.data.stage === "internal" ? "onaylayan" : "marka",
    action: "isaret_eklendi",
    meta: { stage: parsed.data.stage },
  });
  return json(annotation);
}

export async function DELETE(req: Request, _ctx: Ctx) {
  const annotationId = new URL(req.url).searchParams.get("annotationId");
  if (!annotationId) return json({ error: "annotationId required" }, 400);
  await getStore().deleteAnnotation(annotationId);
  return new Response(null, { status: 204 });
}
