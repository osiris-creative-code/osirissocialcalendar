import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { publishStats } from "@/lib/publish";

type Ctx = { params: Promise<{ id: string }> };

/** Toggle one slot's published state. Auto-advances the plan to "tamamlandi" at 100%. */
export async function PATCH(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);
  if (plan.stage !== "yayinda" && plan.stage !== "tamamlandi") {
    return json({ error: "plan yayında değil" }, 400);
  }

  const body = (await req.json().catch(() => null)) as
    | { itemId?: string; published?: boolean }
    | null;
  if (!body?.itemId || typeof body.published !== "boolean") {
    return json({ error: "itemId + published required" }, 400);
  }

  const items = await store.listItems(id);
  const item = items.find((i) => i.id === body.itemId);
  if (!item) return json({ error: "item not found" }, 404);

  await store.updateItem(body.itemId, {
    publishedAt: body.published ? new Date().toISOString() : null,
  });

  const fresh = await store.listItems(id);
  const { published, total } = publishStats(fresh);
  let stage = plan.stage;
  if (total > 0 && published === total && plan.stage === "yayinda") {
    stage = "tamamlandi";
    await store.updatePlan(id, { stage });
    await store.logActivity({
      planId: id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "plan_tamamlandi",
      meta: { published, total },
    });
  }

  return json({ plan: await store.getPlan(id), items: fresh });
}

/** Start publishing (onaylandi → yayinda) or roll it back (yayinda/tamamlandi → onaylandi). */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);

  const body = (await req.json().catch(() => null)) as { action?: "start" | "revert" } | null;

  if (body?.action === "start") {
    if (plan.stage !== "onaylandi") return json({ error: "plan onaylı değil" }, 400);
    await store.updatePlan(id, { stage: "yayinda", lastActorName: actor.name });
  } else if (body?.action === "revert") {
    if (plan.stage !== "yayinda" && plan.stage !== "tamamlandi") {
      return json({ error: "geri alınacak yayın yok" }, 400);
    }
    for (const it of await store.listItems(id)) {
      if (it.publishedAt) await store.updateItem(it.id, { publishedAt: null });
    }
    await store.updatePlan(id, { stage: "onaylandi", lastActorName: actor.name });
  } else {
    return json({ error: "action must be start|revert" }, 400);
  }

  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "yayin_durumu",
    meta: { action: body?.action },
  });
  return json({ plan: await store.getPlan(id), items: await store.listItems(id) });
}
