import { getStore } from "@/lib/db";
import { json } from "@/lib/api/session";
import { newId } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Accepting a "make these a carousel" suggestion: give the run a shared
 * slideGroup so the planner treats it as one post with several slides.
 * `slideGroup` already drives carousels elsewhere — no new concept here.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { assetIds?: string[] } | null;
  const assetIds = body?.assetIds?.filter((x) => typeof x === "string") ?? [];
  if (assetIds.length < 2) return json({ error: "en az 2 görsel gerekli" }, 400);

  const store = getStore();
  const assets = await store.listAssets(id);
  const wanted = assets.filter((a) => assetIds.includes(a.id));
  if (wanted.length !== assetIds.length) return json({ error: "asset not found" }, 404);

  const group = `g_${newId()}`;
  // slideOrder follows the existing upload order so the carousel reads correctly.
  const ordered = [...wanted].sort((a, b) => a.sort - b.sort);
  for (let i = 0; i < ordered.length; i++) {
    await store.updateAssets([ordered[i].id], { slideGroup: group, slideOrder: i + 1 });
  }

  return json({ assets: await store.listAssets(id), slideGroup: group });
}
