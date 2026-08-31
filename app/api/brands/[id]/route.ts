import { getStore } from "@/lib/db";
import { json, requireBrandAdder, requireBrandArchiver } from "@/lib/api/session";
import type { Brand } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE: (keyof Brand)[] = [
  "name",
  "logoUrl",
  "colorPrimary",
  "colorAccent",
  "instagramHandle",
  "feedScreenshotUrl",
  "status",
];

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Partial<Brand> | null;
  if (!body) return json({ error: "body required" }, 400);

  // Archiving (status change) needs the developer role; other edits need brand-add rights.
  const guard = "status" in body ? requireBrandArchiver(req) : requireBrandAdder(req);
  if (guard instanceof Response) return guard;

  const existing = await getStore().getBrand(id);
  if (!existing) return json({ error: "brand not found" }, 404);

  const patch: Partial<Brand> = {};
  for (const key of EDITABLE) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key];
  }
  const updated = await getStore().updateBrand(id, patch);
  return json(updated);
}
