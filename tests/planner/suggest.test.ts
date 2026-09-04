import { describe, it, expect } from "vitest";
import { shootCounts, daySpan, cadenceBrief } from "@/lib/planner/suggest";
import type { PlanAsset } from "@/lib/types";

const a = (over: Partial<PlanAsset>): PlanAsset => ({
  id: Math.random().toString(36).slice(2),
  planId: "p",
  type: "post",
  kind: "image",
  url: "https://x/i.jpg",
  name: "i.jpg",
  slideGroup: null,
  slideOrder: 1,
  sort: 0,
  ...over,
});

describe("shootCounts", () => {
  it("counts carousels once and drops placeholders", () => {
    const assets = [
      a({ type: "post" }),
      a({ type: "post", slideGroup: "g1" }),
      a({ type: "post", slideGroup: "g1" }),
      a({ type: "post", slideGroup: "g1" }),
      a({ type: "story" }),
      a({ type: "story" }),
      a({ type: "reel", kind: "video" }),
      a({ type: "reel", kind: "video", placeholder: true }),
    ];
    expect(shootCounts(assets)).toEqual({ post: 2, story: 2, reel: 1 });
  });
});

describe("daySpan", () => {
  it("is inclusive", () => {
    expect(daySpan("2026-09-01", "2026-09-01")).toBe(1);
    expect(daySpan("2026-09-01", "2026-09-14")).toBe(14);
  });
});

describe("cadenceBrief", () => {
  it("turns counts + span into a parser-friendly line", () => {
    expect(cadenceBrief(14, { post: 7, story: 14, reel: 2 })).toBe(
      "2 günde bir post, her gün story, haftada 1 reels",
    );
  });
  it("uses 'N günde bir reels' when it isn't weekly", () => {
    expect(cadenceBrief(20, { post: 5, story: 20, reel: 2 })).toBe(
      "4 günde bir post, her gün story, 10 günde bir reels",
    );
  });
  it("omits a slot with zero content", () => {
    expect(cadenceBrief(10, { post: 0, story: 10, reel: 0 })).toBe("her gün story");
  });
});
