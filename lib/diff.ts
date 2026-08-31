import type { PlanItem } from "@/lib/types";

export type ItemDiff =
  | { kind: "added"; date: string; type: string; caption: string | null }
  | { kind: "removed"; date: string; type: string; caption: string | null }
  | { kind: "moved"; date: string; type: string; fromDate: string; toDate: string }
  | { kind: "caption"; date: string; type: string; before: string | null; after: string | null }
  | { kind: "media"; date: string; type: string };

/**
 * Compare two item snapshots. Items are matched by a stable key: their `id` when
 * present in both, otherwise `type + slot position`. Story caption is always null
 * so caption diffs never fire for stories.
 */
export function diffPlanItems(before: PlanItem[], after: PlanItem[]): ItemDiff[] {
  const beforeById = new Map(before.map((i) => [i.id, i]));
  const afterById = new Map(after.map((i) => [i.id, i]));
  const out: ItemDiff[] = [];

  for (const b of before) {
    if (!afterById.has(b.id)) {
      out.push({ kind: "removed", date: b.date, type: b.type, caption: b.caption });
    }
  }

  for (const a of after) {
    const b = beforeById.get(a.id);
    if (!b) {
      out.push({ kind: "added", date: a.date, type: a.type, caption: a.caption });
      continue;
    }
    if (b.date !== a.date) {
      out.push({ kind: "moved", date: a.date, type: a.type, fromDate: b.date, toDate: a.date });
    }
    if ((b.caption ?? null) !== (a.caption ?? null)) {
      out.push({ kind: "caption", date: a.date, type: a.type, before: b.caption ?? null, after: a.caption ?? null });
    }
    if (mediaSig(b) !== mediaSig(a)) {
      out.push({ kind: "media", date: a.date, type: a.type });
    }
  }

  return out;
}

function mediaSig(i: PlanItem): string {
  return i.media.map((m) => m.url).join("|");
}
