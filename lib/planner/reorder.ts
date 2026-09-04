import type { PlanItem } from "@/lib/types";

/**
 * Rebuild `sort` so it matches calendar order: date first, then the order the
 * items already had within that date. Stable — same-day items keep their
 * relative order instead of being shuffled by the sort.
 */
export function normalize(items: PlanItem[]): PlanItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.date.localeCompare(b.item.date) || a.index - b.index)
    .map(({ item }, index) => ({ ...item, sort: index }));
}

/** Items of one calendar day, in display order. */
export type DayGroup = { date: string; items: PlanItem[] };

/** Group into one entry per day, preserving the incoming order within each day. */
export function groupByDate(items: PlanItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}

/**
 * Move `activeId` to sit where `overId` currently is.
 *
 * `overId` is either another item's id (drop onto a row) or `day:<YYYY-MM-DD>`
 * (drop onto a day's empty space). Landing on a different day **changes the
 * moved item's date** — that is the whole point of dragging in a calendar;
 * reordering without rescheduling is what confused people before.
 */
export function moveItem(items: PlanItem[], activeId: string, overId: string): PlanItem[] {
  const from = items.findIndex((i) => i.id === activeId);
  if (from === -1 || activeId === overId) return items;

  const target = items.find((i) => i.id === overId);
  const date = target ? target.date : overId.startsWith("day:") ? overId.slice(4) : null;
  if (date === null) return items;

  const moved = { ...items[from], date };
  const rest = items.filter((_, i) => i !== from);
  const at = target ? rest.findIndex((i) => i.id === overId) : rest.length;
  const insertAt = at === -1 ? rest.length : at;

  return normalize([...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)]);
}

/**
 * Merge already-generated post items into one carousel — the same shot type
 * check as merge-carousel, just after generation instead of before it. The
 * kept item is whichever selected item is earliest on the calendar; its date,
 * caption and id survive, and every selected item's media is concatenated
 * onto it in that same order with slideOrder renumbered. The rest are removed.
 *
 * Callers validate eligibility (type "post", not a gap) before calling this —
 * it assumes `ids` is already a valid, mergeable set.
 */
export function mergePostItems(items: PlanItem[], ids: string[]): PlanItem[] {
  const idSet = new Set(ids);
  const chosen = items.filter((i) => idSet.has(i.id));
  if (chosen.length < 2) return items;

  const ordered = [...chosen].sort(
    (a, b) => a.date.localeCompare(b.date) || a.sort - b.sort,
  );
  const keep = ordered[0];

  const merged: PlanItem = {
    ...keep,
    media: ordered.flatMap((i) => i.media).map((m, idx) => ({ ...m, slideOrder: idx + 1 })),
  };

  const rest = items.filter((i) => !idSet.has(i.id));

  return normalize([...rest, merged]);
}
