import { describe, it, expect } from "vitest";
import { MockAI } from "@/lib/ai/mock";
import type { SuggestPlanRequest } from "@/lib/ai/types";

const base: SuggestPlanRequest = {
  brandName: "Rafine",
  rangeStart: "2026-09-01",
  rangeEnd: "2026-09-14",
  counts: { post: 4, story: 10, reel: 1 },
  cadenceBrief: "3 günde bir post, her gün story",
  imageUrls: [],
};

describe("suggestPlan with brand rules", () => {
  it("uses the brand's own cadence when it has one", async () => {
    const res = await new MockAI().suggestPlan({
      ...base,
      contentRules: "her gün post, her gün story, pazar paylaşım yok",
    });
    expect(res.prompt).toContain("her gün post");
    expect(res.prompt).toContain("pazar paylaşım yok");
    expect(res.note).toContain("Marka kuralları");
  });

  it("falls back to the computed cadence when the brand has no rules", async () => {
    const res = await new MockAI().suggestPlan(base);
    expect(res.prompt).toContain("3 günde bir post");
    expect(res.note).not.toContain("Marka kuralları");
  });

  it("treats blank rules as no rules", async () => {
    const res = await new MockAI().suggestPlan({ ...base, contentRules: "   " });
    expect(res.prompt).toContain("3 günde bir post");
  });
});
