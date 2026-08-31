import { json, requireEditor } from "@/lib/api/session";
import { createUploadTarget } from "@/lib/uploads";

/** Generic upload target (brand logos, etc.) — not tied to a plan. */
export async function POST(req: Request) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  if (!body?.name) return json({ error: "name required" }, 400);

  return json(await createUploadTarget(body.name));
}
