import { getStore } from "@/lib/db";
import { json } from "@/lib/api/session";
import { canTransition } from "@/lib/plan-stages";
import type { Stage } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { round?: "revize" | "onay"; authorName?: string }
    | null;
  const round = body?.round;
  const authorName = body?.authorName?.trim() || "Marka";
  if (round !== "revize" && round !== "onay") return json({ error: "round required" }, 400);

  const store = getStore();
  const plan = await store.getPlan(id);
  if (!plan) return json({ error: "plan not found" }, 404);
  if (plan.stage !== "markada") {
    return json({ error: "plan markada değil" }, 400);
  }

  const to: Stage = round === "onay" ? "onaylandi" : "revize_istendi";
  if (!canTransition(plan.stage, to)) return json({ error: "geçersiz geçiş" }, 400);

  await store.updatePlan(id, { stage: to, lastActorName: authorName });
  await store.logActivity({
    planId: id,
    actorName: authorName,
    actorRole: "marka",
    action: round === "onay" ? "marka_onayladi" : "marka_revize_istedi",
    meta: {},
  });
  return json({ stage: to });
}
