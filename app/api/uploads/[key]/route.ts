import { json } from "@/lib/api/session";
import { storeIsPersistent } from "@/lib/db";
import { writeLocalUpload } from "@/lib/uploads";

type Ctx = { params: Promise<{ key: string }> };

/** Local-dev upload sink. On Supabase deployments the browser PUTs to the signed URL instead. */
export async function PUT(req: Request, ctx: Ctx) {
  if (storeIsPersistent()) return json({ error: "not available with Supabase" }, 400);
  const { key } = await ctx.params;
  const bytes = Buffer.from(await req.arrayBuffer());
  await writeLocalUpload(decodeURIComponent(key), bytes);
  return new Response(null, { status: 204 });
}
