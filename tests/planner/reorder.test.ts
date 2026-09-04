import { describe, it, expect } from "vitest";
import { groupByDate, mergePostItems, moveItem, normalize } from "@/lib/planner/reorder";
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

describe("mergePostItems", () => {
  function post(id: string, date: string, sort: number, mediaCount = 1): PlanItem {
    return {
      id,
      planId: "p",
      date,
      type: "post",
      sort,
      caption: `caption-${id}`,
      specialLabel: null,
      media: Array.from({ length: mediaCount }, (_, i) => ({
        url: `/${id}-${i}.jpg`,
        kind: "image" as const,
        slideOrder: i + 1,
      })),
      isGap: false,
      hidden: false,
      publishedAt: null,
    };
  }

  it("keeps the earliest item's id, date and caption", () => {
    const items = [post("late", "2026-09-05", 1), post("early", "2026-09-02", 0)];
    const out = mergePostItems(items, ["late", "early"]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "early", date: "2026-09-02", caption: "caption-early" });
  });

  it("concatenates every selected item's media, renumbering slideOrder", () => {
    const items = [post("a", "2026-09-01", 0, 2), post("b", "2026-09-02", 1, 1)];
    const out = mergePostItems(items, ["a", "b"]);
    expect(out[0].media.map((m) => m.url)).toEqual(["/a-0.jpg", "/a-1.jpg", "/b-0.jpg"]);
    expect(out[0].media.map((m) => m.slideOrder)).toEqual([1, 2, 3]);
  });

  it("removes the merged-away items and leaves untouched items alone", () => {
    const items = [post("a", "2026-09-01", 0), post("b", "2026-09-02", 1), post("c", "2026-09-03", 2)];
    const out = mergePostItems(items, ["a", "b"]);
    expect(out.map((i) => i.id).sort()).toEqual(["a", "c"]);
  });

  it("is a no-op given fewer than two ids", () => {
    const items = [post("a", "2026-09-01", 0)];
    expect(mergePostItems(items, ["a"])).toBe(items);
  });

  it("renumbers sort to match the resulting calendar order", () => {
    const items = [post("a", "2026-09-05", 0), post("b", "2026-09-01", 1), post("c", "2026-09-03", 2)];
    const out = mergePostItems(items, ["a", "c"]);
    // merged item takes "c"'s date (2026-09-03, earlier than "a"'s), so order is b, merged(a), 
    expect(out.map((i) => i.date)).toEqual(["2026-09-01", "2026-09-03"]);
    expect(out.map((i) => i.sort)).toEqual([0, 1]);
  });
});
