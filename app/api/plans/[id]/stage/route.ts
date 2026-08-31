import { getStore } from "@/lib/db";
import { json } from "@/lib/api/session";
import { canTransition, mintsPublicToken } from "@/lib/plan-stages";
import { newToken } from "@/lib/tokens";
import { ROLES, STAGES, type Role, type Stage } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { to?: Stage; actorName?: string; actorRole?: Role }
    | null;

  const to = body?.to;
  const actorName = body?.actorName?.trim();
  const actorRole = body?.actorRole;
  if (!to || !(STAGES as readonly string[]).includes(to)) return json({ error: "invalid stage" }, 400);
  if (!actorName) return json({ error: "actorName required" }, 400);
  if (!actorRole || !(ROLES as readonly string[]).includes(actorRole)) {
    return json({ error: "invalid actorRole" }, 400);
  }

  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);

  if (!canTransition(plan.stage, to)) {
    return json({ error: `geçersiz geçiş: ${plan.stage} → ${to}` }, 400);
  }

  const patch: Record<string, unknown> = { stage: to, lastActorName: actorName };
  if (mintsPublicToken(plan.stage, to)) patch.publicToken = newToken("c");

  const updated = await store.updatePlan(id, patch);

  if (to === "markada") {
    await store.snapshotPlan(
      id,
      plan.stage === "revize_istendi" ? "Revizyon yayını" : "İlk yayın",
      actorName,
    );
  }

  await store.logActivity({
    planId: id,
    actorName,
    actorRole,
    action: "asama_degisti",
    meta: { from: plan.stage, to },
  });
  return json(updated);
}
