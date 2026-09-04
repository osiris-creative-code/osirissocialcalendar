import { describe, it, expect } from "vitest";
import { calendarWeeks } from "@/lib/planner/calendar";
import type { PlanItem } from "@/lib/types";

function item(id: string, date: string): PlanItem {
  return {
    id, planId: "p", date, type: "post", sort: 0, caption: null, specialLabel: null,
    media: [], isGap: false, hidden: false, publishedAt: null,
  };
}

describe("calendarWeeks", () => {
  it("returns whole weeks of seven days", () => {
    const weeks = calendarWeeks("2026-09-05", "2026-09-30", []);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("starts each week on Monday", () => {
    const weeks = calendarWeeks("2026-09-05", "2026-09-30", []);
    // 2026-09-05 is a Saturday, so the grid opens on Monday 2026-08-31.
    expect(weeks[0][0].date).toBe("2026-08-31");
  });

  it("marks the padding days outside the range", () => {
    const weeks = calendarWeeks("2026-09-05", "2026-09-30", []);
    expect(weeks[0][0].inRange).toBe(false);
    expect(weeks[0].find((d) => d.date === "2026-09-05")!.inRange).toBe(true);
  });

  it("covers every day of the range, empty ones included", () => {
    const weeks = calendarWeeks("2026-09-05", "2026-09-30", [item("a", "2026-09-07")]);
    const inRange = weeks.flat().filter((d) => d.inRange);
    expect(inRange).toHaveLength(26);
    expect(inRange.filter((d) => d.items.length === 0)).toHaveLength(25);
  });

  it("puts each item in its own day", () => {
    const weeks = calendarWeeks("2026-09-05", "2026-09-07", [
      item("a", "2026-09-06"),
      item("b", "2026-09-06"),
      item("c", "2026-09-07"),
    ]);
    const cells = weeks.flat();
    expect(cells.find((d) => d.date === "2026-09-06")!.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(cells.find((d) => d.date === "2026-09-07")!.items.map((i) => i.id)).toEqual(["c"]);
  });

  it("is empty for a reversed range", () => {
    expect(calendarWeeks("2026-09-30", "2026-09-05", [])).toEqual([]);
  });
});
