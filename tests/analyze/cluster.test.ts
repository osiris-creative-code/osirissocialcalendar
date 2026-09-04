import { describe, it, expect } from "vitest";
import { findSimilarCandidates, MAX_CANDIDATES } from "@/lib/analyze/cluster";
import type { PlanAsset } from "@/lib/types";

function asset(over: Partial<PlanAsset> & { id: string; name: string; sort: number }): PlanAsset {
  return {
    planId: "p",
    type: "post",
    kind: "image",
    url: `/u/${over.id}.jpg`,
    slideGroup: null,
    slideOrder: 1,
    ...over,
  };
}

describe("findSimilarCandidates", () => {
  it("groups a consecutive run from the same camera series", () => {
    const out = findSimilarCandidates([
      asset({ id: "a", name: "IMG_1201.jpg", sort: 0 }),
      asset({ id: "b", name: "IMG_1202.jpg", sort: 1 }),
      asset({ id: "c", name: "IMG_1203.jpg", sort: 2 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].assetIds).toEqual(["a", "b", "c"]);
  });

  it("breaks the run when the series or numbering jumps", () => {
    const out = findSimilarCandidates([
      asset({ id: "a", name: "IMG_1201.jpg", sort: 0 }),
      asset({ id: "b", name: "IMG_1202.jpg", sort: 1 }),
      asset({ id: "c", name: "DSC_0007.jpg", sort: 2 }),
      asset({ id: "d", name: "IMG_9000.jpg", sort: 3 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].assetIds).toEqual(["a", "b"]);
  });

  it("never groups across content types", () => {
    const out = findSimilarCandidates([
      asset({ id: "a", name: "IMG_1201.jpg", sort: 0, type: "post" }),
      asset({ id: "b", name: "IMG_1202.jpg", sort: 1, type: "story" }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("skips assets that are already a carousel, and placeholders", () => {
    const out = findSimilarCandidates([
      asset({ id: "a", name: "IMG_1201.jpg", sort: 0, slideGroup: "g1" }),
      asset({ id: "b", name: "IMG_1202.jpg", sort: 1, slideGroup: "g1" }),
      asset({ id: "c", name: "IMG_1203.jpg", sort: 2, placeholder: true }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("ignores videos — only stills can become a carousel here", () => {
    const out = findSimilarCandidates([
      asset({ id: "a", name: "REEL_01.mp4", sort: 0, kind: "video", type: "reel" }),
      asset({ id: "b", name: "REEL_02.mp4", sort: 1, kind: "video", type: "reel" }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("caps how many groups are ever sent to the model", () => {
    const assets = [];
    for (let g = 0; g < 10; g++) {
      assets.push(asset({ id: `x${g}a`, name: `SET${g}_01.jpg`, sort: g * 2 }));
      assets.push(asset({ id: `x${g}b`, name: `SET${g}_02.jpg`, sort: g * 2 + 1 }));
    }
    expect(findSimilarCandidates(assets).length).toBeLessThanOrEqual(MAX_CANDIDATES);
  });
});
