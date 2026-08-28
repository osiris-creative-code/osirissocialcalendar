import { describe, it, expect } from "vitest";
import { buildSlots, assignAssets } from "@/lib/planner/distribute";
import { planFromPrompt } from "@/lib/planner";

describe("buildSlots", () => {
  it("expands '2 günde bir post' across a range", () => {
    const slots = buildSlots(
      [{ type: "post", every: 2, unit: "day", weekdaysOnly: false }],
      "2026-09-01",
      "2026-09-07",
    );
    expect(slots.map((s) => s.date)).toEqual([
      "2026-09-01",
      "2026-09-03",
      "2026-09-05",
      "2026-09-07",
    ]);
  });

  it("includes special-day slots", () => {
    const slots = buildSlots(
      [{ type: "special", onDates: ["2026-09-07"] }],
      "2026-09-01",
      "2026-09-10",
    );
    expect(slots).toEqual([{ date: "2026-09-07", type: "special", specialLabel: undefined }]);
  });

  it("skips weekends when weekdaysOnly", () => {
    // 2026-09-05 is a Saturday, 09-06 a Sunday
    const slots = buildSlots(
      [{ type: "post", every: 1, unit: "day", weekdaysOnly: true }],
      "2026-09-04",
      "2026-09-07",
    );
    expect(slots.map((s) => s.date)).toEqual(["2026-09-04", "2026-09-07"]);
  });
});

describe("assignAssets", () => {
  const slots = [
    { date: "2026-09-01", type: "post" as const },
    { date: "2026-09-03", type: "post" as const },
    { date: "2026-09-05", type: "post" as const },
  ];

  it("leaves flagged gaps in extend, truncates stopAtAssets", () => {
    const assets = [
      { id: "a1", type: "post" as const, slideOrder: 0 },
      { id: "a2", type: "post" as const, slideOrder: 0 },
    ];
    const { extend, stopAtAssets, gap } = assignAssets(slots, assets);
    expect(extend.map((i) => i.isGap)).toEqual([false, false, true]);
    expect(stopAtAssets).toHaveLength(2);
    expect(gap).toBe(true);
  });

  it("groups carousel assets by slideGroup", () => {
    const assets = [
      { id: "a1", type: "post" as const, slideGroup: "g1", slideOrder: 1 },
      { id: "a2", type: "post" as const, slideGroup: "g1", slideOrder: 2 },
    ];
    const { extend } = assignAssets([slots[0]], assets);
    expect(extend[0].assetIds).toEqual(["a1", "a2"]);
  });
});

describe("planFromPrompt", () => {
  it("wires parse -> slots -> assign", () => {
    const res = planFromPrompt(
      "her gün story",
      "2026-09-01",
      "2026-09-03",
      [
        { id: "s1", type: "story", slideOrder: 0 },
        { id: "s2", type: "story", slideOrder: 0 },
      ],
    );
    expect(res.rules).toHaveLength(1);
    expect(res.extend.map((i) => i.date)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(res.gap).toBe(true); // 3 slots, 2 assets
  });
});
