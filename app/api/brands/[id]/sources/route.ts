import { getStore } from "@/lib/db";
import { json, requireBrandAdder } from "@/lib/api/session";
import { parseDriveFolderId } from "@/lib/sources/drive-folder";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return json(await getStore().listSources(id));
}

/** Set (or clear) the brand's public Drive folder. Body: { url: string }. */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireBrandAdder(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  if (!(await store.getBrand(id))) return json({ error: "brand not found" }, 404);

  const body = (await req.json().catch(() => null)) as { url?: string } | null;
  const folderId = body?.url ? parseDriveFolderId(body.url) : null;
  if (!folderId) return json({ error: "geçerli bir Drive klasör linki değil" }, 400);

  const existing = (await store.listSources(id)).find((s) => s.kind === "drive_folder");
  const source = existing
    ? await store.updateSource(existing.id, { config: { folderId } })
    : await store.createSource({
        brandId: id,
        kind: "drive_folder",
        label: "Google Drive klasörü",
        config: { folderId },
      });
  return json(source);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const actor = requireBrandAdder(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const store = getStore();
  const existing = (await store.listSources(id)).find((s) => s.kind === "drive_folder");
  if (existing) await store.deleteSource(existing.id);
  return new Response(null, { status: 204 });
}
