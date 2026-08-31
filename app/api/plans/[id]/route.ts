import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { deleteUploads } from "@/lib/uploads";
import type { NewItem } from "@/lib/data/store";
import type { PlanTheme } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);
  const items = await store.listItems(id);
  return json({ plan, items });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);

  const body = (await req.json().catch(() => null)) as
    | {
        title?: string;
        theme?: PlanTheme;
        items?: NewItem[];
        visionEnabled?: boolean;
        reviseDeadline?: string | null;
      }
    | null;
  if (!body) return json({ error: "body required" }, 400);

  if (body.items) {
    await store.replaceItems(id, body.items.map((it, idx) => ({ ...it, sort: idx })));
  }
  const patch: Record<string, unknown> = { version: plan.version + 1 };
  if (body.title?.trim()) patch.title = body.title.trim();
  if (body.theme) patch.theme = body.theme;
  if (typeof body.visionEnabled === "boolean") patch.visionEnabled = body.visionEnabled;
  if ("reviseDeadline" in body) patch.reviseDeadline = body.reviseDeadline || null;
  const updated = await store.updatePlan(id, patch);

  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "plan_duzenlendi",
    meta: { fields: Object.keys(body) },
  });

  const items = await store.listItems(id);
  return json({ plan: updated, items });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);

  const [assets, items] = await Promise.all([store.listAssets(id), store.listItems(id)]);
  await store.deletePlan(id);
  await deleteUploads([
    ...assets.map((a) => a.url),
    ...items.flatMap((i) => i.media.map((m) => m.url)),
  ]);
  return new Response(null, { status: 204 });
}
