import { describe, it, expect } from "vitest";
import { diffPlanItems } from "@/lib/diff";
import type { PlanItem } from "@/lib/types";

const item = (over: Partial<PlanItem>): PlanItem => ({
  id: "x",
  planId: "p",
  date: "2026-09-01",
  type: "post",
  sort: 0,
  caption: "A",
  specialLabel: null,
  media: [{ url: "/u/1.jpg", kind: "image", slideOrder: 1 }],
  isGap: false,
  hidden: false,
  publishedAt: null,
  ...over,
});

describe("diffPlanItems", () => {
  it("detects a caption change", () => {
    const before = [item({ id: "1", caption: "Eski" })];
    const after = [item({ id: "1", caption: "Yeni" })];
    expect(diffPlanItems(before, after)).toEqual([
      { kind: "caption", date: "2026-09-01", type: "post", before: "Eski", after: "Yeni" },
    ]);
  });

  it("detects moved, added, removed, media", () => {
    const before = [
      item({ id: "1", date: "2026-09-01" }),
      item({ id: "2", date: "2026-09-03", caption: "kalkacak" }),
      item({ id: "3", media: [{ url: "/u/old.jpg", kind: "image", slideOrder: 1 }] }),
    ];
    const after = [
      item({ id: "1", date: "2026-09-02" }), // moved
      item({ id: "3", media: [{ url: "/u/new.jpg", kind: "image", slideOrder: 1 }] }), // media
      item({ id: "4", date: "2026-09-05", caption: "yeni öğe" }), // added
    ];
    const kinds = diffPlanItems(before, after).map((d) => d.kind).sort();
    expect(kinds).toEqual(["added", "media", "moved", "removed"]);
  });

  it("no diff for identical snapshots", () => {
    const a = [item({ id: "1" }), item({ id: "2", date: "2026-09-02" })];
    expect(diffPlanItems(a, a.map((x) => ({ ...x })))).toEqual([]);
  });
});
