import { getStore } from "@/lib/db";
import { hasDeveloper, json, requireBrandAdder } from "@/lib/api/session";

export async function GET(req: Request) {
  const all = new URL(req.url).searchParams.get("all") === "1" && hasDeveloper(req);
  const brands = await getStore().listBrands({ includeArchived: all });
  return json(brands);
}

export async function POST(req: Request) {
  const actor = requireBrandAdder(req);
  if (actor instanceof Response) return actor;

  const body = (await req.json().catch(() => null)) as
    | { name?: string; colorPrimary?: string; colorAccent?: string; instagramHandle?: string | null }
    | null;
  if (!body?.name?.trim() || !body.colorPrimary || !body.colorAccent) {
    return json({ error: "name, colorPrimary, colorAccent required" }, 400);
  }

  const brand = await getStore().createBrand({
    name: body.name.trim(),
    logoUrl: "/demo/ph-2.svg",
    colorPrimary: body.colorPrimary,
    colorAccent: body.colorAccent,
    instagramHandle: body.instagramHandle?.trim() || null,
    createdByName: actor.name,
  });
  return json(brand);
}
