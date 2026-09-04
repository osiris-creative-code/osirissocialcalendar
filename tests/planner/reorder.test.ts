import { describe, it, expect } from "vitest";
import { groupByDate, moveItem, normalize } from "@/lib/planner/reorder";
import type { PlanItem } from "@/lib/types";

function item(id: string, date: string, sort: number): PlanItem {
  return {
    id,
    planId: "p",
    date,
    type: "post",
    sort,
    caption: id,
    specialLabel: null,
    media: [],
    isGap: false,
    hidden: false,
    publishedAt: null,
  };
}

const items = [
  item("a", "2026-09-01", 0),
  item("b", "2026-09-01", 1),
  item("c", "2026-09-03", 2),
];

describe("normalize", () => {
  it("orders by date and keeps same-day order stable", () => {
    const out = normalize([item("c", "2026-09-03", 0), item("b", "2026-09-01", 1), item("a", "2026-09-01", 2)]);
    expect(out.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(out.map((i) => i.sort)).toEqual([0, 1, 2]);
  });
});

describe("groupByDate", () => {
  it("makes one group per day", () => {
    const groups = groupByDate(items);
    expect(groups.map((g) => g.date)).toEqual(["2026-09-01", "2026-09-03"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("moveItem", () => {
  it("changes the moved item's date when it lands on another day", () => {
    const out = moveItem(items, "a", "c");
    expect(out.find((i) => i.id === "a")!.date).toBe("2026-09-03");
  });

  it("reorders within the same day without changing dates", () => {
    const out = moveItem(items, "b", "a");
    expect(out.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(out.every((i) => i.id === "c" || i.date === "2026-09-01")).toBe(true);
  });

  it("accepts a day:<date> drop target for a day's empty space", () => {
    const out = moveItem(items, "c", "day:2026-09-01");
    expect(out.find((i) => i.id === "c")!.date).toBe("2026-09-01");
    expect(out.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("renumbers sort so it matches calendar order", () => {
    const out = moveItem(items, "a", "c");
    expect(out.map((i) => i.sort)).toEqual([0, 1, 2]);
    expect(out.map((i) => i.date)).toEqual(["2026-09-01", "2026-09-03", "2026-09-03"]);
  });

  it("is a no-op for an unknown id or a drop on itself", () => {
    expect(moveItem(items, "zzz", "a")).toBe(items);
    expect(moveItem(items, "a", "a")).toBe(items);
  });
});
