import type { PlanAsset } from "@/lib/types";

export type ShootCounts = { post: number; story: number; reel: number };

/** Count real assets by slot. Carousels (same slideGroup) count once. Placeholders excluded. */
export function shootCounts(assets: PlanAsset[]): ShootCounts {
  const real = assets.filter((a) => !a.placeholder);
  const postGroups = new Set<string>();
  let story = 0;
  let reel = 0;
  for (const a of real) {
    if (a.type === "story") story += 1;
    else if (a.type === "reel") reel += 1;
    else postGroups.add(a.slideGroup ? `g:${a.slideGroup}` : `s:${a.id}`);
  }
  return { post: postGroups.size, story, reel };
}

export function daySpan(rangeStart: string, rangeEnd: string): number {
  const a = new Date(`${rangeStart}T00:00:00Z`).getTime();
  const b = new Date(`${rangeEnd}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function every(count: number, days: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.round(days / count));
}

/** A parser-friendly Turkish cadence brief from the asset counts over the date range. */
export function cadenceBrief(days: number, counts: ShootCounts): string {
  const parts: string[] = [];

  const p = every(counts.post, days);
  if (p === 1) parts.push("her gün post");
  else if (p >= 2) parts.push(`${p} günde bir post`);

  const s = every(counts.story, days);
  if (s === 1) parts.push("her gün story");
  else if (s >= 2) parts.push(`${s} günde bir story`);

  const r = every(counts.reel, days);
  if (r === 7) parts.push("haftada 1 reels");
  else if (r >= 2) parts.push(`${r} günde bir reels`);
  else if (r === 1) parts.push("her gün reels");

  return parts.join(", ") || "içeriğe göre dengeli dağıt";
}
