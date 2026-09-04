import type { ItemType, PlanAsset } from "@/lib/types";

/** A run of shots that probably came from the same moment of the shoot. */
export type SimilarCandidate = {
  id: string;
  type: ItemType;
  assetIds: string[];
  names: string[];
  /** Why the cheap pass flagged it — shown if the AI call can't be made. */
  hint: string;
};

/** Never hand the model more than this many groups — cost and latency guard. */
export const MAX_CANDIDATES = 4;
const MAX_PER_GROUP = 5;

function stripExt(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

/** "IMG_1234" -> { stem: "IMG_", n: 1234 }; no trailing number -> n === null. */
function splitNumericTail(name: string): { stem: string; n: number | null } {
  const m = stripExt(name).match(/^(.*?)(\d+)$/);
  if (!m) return { stem: stripExt(name), n: null };
  return { stem: m[1], n: Number(m[2]) };
}

function normalizeStem(stem: string): string {
  return stem.toLocaleLowerCase("tr").replace(/[\s_\-()]+/g, "");
}

/**
 * Cheap, offline first pass: which uploads look like they belong together?
 *
 * It reads names and upload order only — no image decoding, no network, no AI.
 * That keeps it instant and free, at the cost of being a *candidate* finder:
 * whether the pictures actually look alike is decided afterwards by the model,
 * which only ever sees these few groups instead of the whole shoot.
 */
export function findSimilarCandidates(assets: PlanAsset[]): SimilarCandidate[] {
  const usable = assets
    .filter((a) => !a.placeholder && !a.slideGroup && a.kind === "image")
    .sort((a, b) => a.sort - b.sort);

  const byType = new Map<ItemType, PlanAsset[]>();
  for (const a of usable) byType.set(a.type, [...(byType.get(a.type) ?? []), a]);

  const out: SimilarCandidate[] = [];

  for (const [type, list] of byType) {
    let run: PlanAsset[] = [];
    const flush = () => {
      if (run.length >= 2) {
        const group = run.slice(0, MAX_PER_GROUP);
        out.push({
          id: `${type}-${group[0].id}`,
          type,
          assetIds: group.map((a) => a.id),
          names: group.map((a) => a.name),
          hint: "Arka arkaya yüklenmiş, dosya adları aynı seriden.",
        });
      }
      run = [];
    };

    for (const asset of list) {
      if (run.length === 0) {
        run = [asset];
        continue;
      }
      const prev = splitNumericTail(run[run.length - 1].name);
      const cur = splitNumericTail(asset.name);
      const sameStem = normalizeStem(prev.stem) === normalizeStem(cur.stem);
      const consecutive = prev.n !== null && cur.n !== null && cur.n - prev.n <= 2 && cur.n > prev.n;

      if (sameStem && consecutive) run.push(asset);
      else {
        flush();
        run = [asset];
      }
    }
    flush();
  }

  return out.slice(0, MAX_CANDIDATES);
}
