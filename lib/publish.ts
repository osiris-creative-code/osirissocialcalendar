import type { PlanItem } from "@/lib/types";

/** Publish tracking counts only the real, visible slots (no gaps, no hidden). */
export function publishStats(items: PlanItem[]): { published: number; total: number } {
  const real = items.filter((i) => !i.isGap && !i.hidden);
  return { published: real.filter((i) => i.publishedAt).length, total: real.length };
}
