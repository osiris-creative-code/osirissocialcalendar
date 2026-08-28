const DAY_MONTH = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const DAY_SHORT = new Intl.DateTimeFormat("tr-TR", { month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });

function atUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** "2026-09-07" -> "7 Eylül" */
export function trDayMonth(iso: string): string {
  return DAY_MONTH.format(atUtc(iso));
}

/** "2026-09-07" -> { day: "07", month: "Eyl", weekday: "Pzt" } */
export function trDateParts(iso: string): { day: string; month: string; weekday: string } {
  return {
    day: iso.slice(8, 10),
    month: DAY_SHORT.format(atUtc(iso)).replace(".", ""),
    weekday: WEEKDAY.format(atUtc(iso)).replace(".", ""),
  };
}

/** "2026-08-28" + "2026-09-11" -> "28 Ağustos – 11 Eylül" */
export function trRange(start: string, end: string): string {
  return `${trDayMonth(start)} – ${trDayMonth(end)}`;
}
