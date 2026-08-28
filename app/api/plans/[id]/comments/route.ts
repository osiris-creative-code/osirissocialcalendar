import { getStore } from "@/lib/db";
import { json } from "@/lib/api/session";
import { zComment } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return json(await getStore().listComments(id));
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const raw = (await req.json().catch(() => null)) as
    | { itemId?: string; [k: string]: unknown }
    | null;
  if (!raw?.itemId) return json({ error: "itemId required" }, 400);

  const parsed = zComment.safeParse({ ...raw, planItemId: raw.itemId });
  if (!parsed.success) return json({ error: "invalid comment", detail: parsed.error.issues }, 400);

  const store = getStore();
  const comment = await store.addComment(parsed.data);
  await store.logActivity({
    planId: id,
    actorName: parsed.data.authorName,
    actorRole: parsed.data.authorRole,
    action: "yorum_eklendi",
    meta: { stage: parsed.data.stage, status: parsed.data.status },
  });
  return json(comment);
}
