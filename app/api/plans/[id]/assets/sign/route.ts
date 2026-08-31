import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { createUploadTarget } from "@/lib/uploads";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  if (!(await getStore().getPlan(id))) return json({ error: "plan not found" }, 404);

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  if (!body?.name) return json({ error: "name required" }, 400);

  return json(await createUploadTarget(body.name));
}
