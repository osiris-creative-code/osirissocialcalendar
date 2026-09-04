import type { PlanItem } from "@/lib/types";

const DAY_MS = 86400000;

export type DayCell = {
  date: string;
  /** false for the leading/trailing days that only exist to square off a week. */
  inRange: boolean;
  items: PlanItem[];
};

function iso(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6, which is how a Turkish calendar reads. */
function mondayIndex(t: number): number {
  return (new Date(t).getUTCDay() + 6) % 7;
}

/**
 * The plan as a real calendar: seven columns, one row per week, every day in
 * the range present whether or not it has content.
 *
 * A column per day laid out horizontally meant ~26 columns for a month and an
 * endless sideways scroll; a week grid shows the whole plan at once and makes
 * the empty days — the ones you actually need to spot — visible.
 */
export function calendarWeeks(
  rangeStart: string,
  rangeEnd: string,
  items: PlanItem[],
): DayCell[][] {
  const byDate = new Map<string, PlanItem[]>();
  for (const item of items) {
    byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  }

  const start = new Date(`${rangeStart}T00:00:00Z`).getTime();
  const end = new Date(`${rangeEnd}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];

  // Square the grid off to whole weeks.
  const gridStart = start - mondayIndex(start) * DAY_MS;
  const gridEnd = end + (6 - mondayIndex(end)) * DAY_MS;

  const weeks: DayCell[][] = [];
  let week: DayCell[] = [];
  for (let t = gridStart; t <= gridEnd; t += DAY_MS) {
    const date = iso(t);
    week.push({
      date,
      inRange: t >= start && t <= end,
      items: byDate.get(date) ?? [],
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push(week);
  return weeks;
}

/** Column headers, Monday first. */
export const WEEKDAY_HEADERS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
