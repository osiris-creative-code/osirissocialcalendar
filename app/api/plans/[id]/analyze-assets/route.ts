import { getStore } from "@/lib/db";
import { json } from "@/lib/api/session";
import { getAI } from "@/lib/ai";
import { visionSafeUrl } from "@/lib/ai/vision-safe";
import { findSimilarCandidates } from "@/lib/analyze/cluster";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export type AssetSuggestion = {
  candidateId: string;
  kind: "carousel" | "spread";
  assetIds: string[];
  names: string[];
  reason: string;
};

/**
 * "Bu görseller birbirine benziyor mu?" — the cheap pass narrows the shoot down
 * to a handful of candidate runs, then the model looks at just those.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = getStore();
  const [plan, assets] = await Promise.all([store.getPlan(id), store.listAssets(id)]);
  if (!plan) return json({ error: "plan not found" }, 404);
  const brand = await store.getBrand(plan.brandId);
  if (!brand) return json({ error: "brand not found" }, 404);

  const candidates = findSimilarCandidates(assets);
  if (candidates.length === 0) {
    return json({ suggestions: [], note: "Birbirine benzeyen bir grup bulunamadı." });
  }

  const byId = new Map(assets.map((a) => [a.id, a]));
  let verdicts;
  try {
    ({ verdicts } = await getAI().groupSimilar({
      brandName: brand.name,
      candidates: candidates.map((c) => ({
        id: c.id,
        type: c.type,
        assetIds: c.assetIds,
        names: c.names,
        imageUrls: c.assetIds
          .map((aid) => visionSafeUrl(byId.get(aid)?.url))
          .filter((u): u is string => !!u),
      })),
    }));
  } catch (e) {
    return json({ error: `Analiz edilemedi: ${(e as Error).message}` }, 502);
  }

  const verdictById = new Map(verdicts.map((v) => [v.candidateId, v]));
  const suggestions: AssetSuggestion[] = [];
  for (const c of candidates) {
    const v = verdictById.get(c.id);
    if (!v || v.verdict === "unrelated") continue;
    suggestions.push({
      candidateId: c.id,
      kind: v.verdict,
      assetIds: c.assetIds,
      names: c.names,
      reason: v.reason || c.hint,
    });
  }

  return json({
    suggestions,
    note:
      suggestions.length === 0
        ? "Analiz edildi — birleştirilecek bir grup çıkmadı."
        : `${suggestions.length} öneri bulundu.`,
  });
}
