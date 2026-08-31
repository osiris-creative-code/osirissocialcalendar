import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return json(await getStore().listVersions(id));
}

export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  if (!(await store.getPlan(id))) return json({ error: "plan not found" }, 404);

  const body = (await req.json().catch(() => ({}))) as { label?: string };
  const version = await store.snapshotPlan(id, body.label?.trim() || "Elle kaydedildi", actor.name);
  await store.logActivity({
    planId: id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "surum_kaydedildi",
    meta: { version: version.version },
  });
  return json(version);
}
