import { describe, it, expect } from "vitest";
import { newId, newToken } from "@/lib/ids";
import { zPlan, zBrand, zPlanItem, STAGES } from "@/lib/types";

describe("ids + tokens", () => {
  it("newId is unique-ish and short", () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
    expect(a.length).toBe(12);
  });
  it("newToken carries its prefix", () => {
    expect(newToken("c").startsWith("c_")).toBe(true);
    expect(newToken("i").startsWith("i_")).toBe(true);
  });
});

describe("zPlan", () => {
  it("rejects an unknown stage", () => {
    const bad = {
      id: "x",
      brandId: "b",
      title: "t",
      rangeStart: "2026-08-28",
      rangeEnd: "2026-09-11",
      prompt: "",
      stage: "nope",
      theme: { primary: "#000", accent: "#111" },
      internalToken: "i_x",
      publicToken: null,
      version: 1,
      lastActorName: null,
      createdAt: "2026-08-28T00:00:00Z",
    };
    expect(zPlan.safeParse(bad).success).toBe(false);
  });

  it("accepts a well-formed plan", () => {
    const ok = {
      id: "x",
      brandId: "b",
      title: "Eylül",
      rangeStart: "2026-08-28",
      rangeEnd: "2026-09-11",
      prompt: "her gün story",
      stage: "taslak",
      theme: { primary: "#000", accent: "#111" },
      internalToken: "i_x",
      publicToken: null,
      version: 1,
      lastActorName: null,
      createdAt: "2026-08-28T00:00:00Z",
      visionEnabled: true,
      feedInsights: null,
      reviseDeadline: null,
      mediaPurgedAt: null,
      driveFolderUrl: null,
    };
    expect(zPlan.safeParse(ok).success).toBe(true);
  });
});

describe("phase 2 schema additions", () => {
  it("STAGES gains yayinda + tamamlandi after onaylandi", () => {
    expect(STAGES).toContain("yayinda");
    expect(STAGES).toContain("tamamlandi");
    expect(STAGES.indexOf("yayinda")).toBeGreaterThan(STAGES.indexOf("onaylandi"));
  });

  it("zPlanItem requires publishedAt (nullable)", () => {
    const base = {
      id: "i",
      planId: "p",
      date: "2026-09-01",
      type: "post",
      sort: 0,
      caption: null,
      specialLabel: null,
      media: [],
      isGap: false,
      hidden: false,
    };
    expect(zPlanItem.safeParse(base).success).toBe(false);
    expect(zPlanItem.safeParse({ ...base, publishedAt: null }).success).toBe(true);
  });

  it("zBrand requires phone / feedThumbs / feedFetchedAt", () => {
    const base = {
      id: "b",
      name: "X",
      logoUrl: "/x.svg",
      colorPrimary: "#000",
      colorAccent: "#111",
      instagramHandle: null,
      feedScreenshotUrl: null,
      status: "active",
      createdByName: "seed",
      createdAt: "2026-09-01T00:00:00Z",
    };
    expect(zBrand.safeParse(base).success).toBe(false);
    expect(
      zBrand.safeParse({ ...base, phone: null, feedThumbs: null, feedFetchedAt: null }).success,
    ).toBe(true);
  });
});
