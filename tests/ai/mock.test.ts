import { describe, it, expect } from "vitest";
import { MockAI } from "@/lib/ai/mock";

describe("MockAI.captions", () => {
  it("returns one caption slot per item, null for story, deterministic", async () => {
    const ai = new MockAI();
    const req = {
      brandName: "Pablo",
      tone: "sıcak",
      items: [
        { date: "2026-09-01", type: "post" as const, specialLabel: null },
        { date: "2026-09-02", type: "story" as const, specialLabel: null },
        { date: "2026-09-07", type: "special" as const, specialLabel: "Dünya Çikolata Günü" },
        { date: "2026-09-09", type: "reel" as const, specialLabel: null },
      ],
    };
    const a = await ai.captions(req);
    const b = await ai.captions(req);
    expect(a.captions).toHaveLength(4);
    expect(a.captions[1]).toBeNull();
    expect(a.captions[0]).toContain("Pablo");
    expect(a.captions[2]).toContain("Dünya Çikolata Günü");
    expect(a.captions[3]).toContain("#reels");
    expect(a).toEqual(b);
  });

  it("folds a feed insight into post captions", async () => {
    const ai = new MockAI();
    const { captions } = await ai.captions({
      brandName: "Pablo",
      tone: "sıcak",
      feedInsights: ["Sıcak toprak tonları ağırlıkta."],
      items: [{ date: "2026-09-01", type: "post" as const, specialLabel: null }],
    });
    expect(captions[0]).toContain("Sıcak toprak tonları ağırlıkta");
  });
});

describe("MockAI.rewriteCaption", () => {
  it("shortens on a 'kısalt' steer", async () => {
    const ai = new MockAI();
    const { caption } = await ai.rewriteCaption({
      brandName: "Pablo",
      tone: "sıcak",
      type: "post",
      current: "Pablo · 1 Eylül — uzun uzun bir açıklama metni burada #pablo",
      instruction: "kısalt",
    });
    expect(caption.length).toBeLessThan(60);
    expect(caption).toContain("#pablo");
  });

  it("returns a changed caption with no steer", async () => {
    const ai = new MockAI();
    const { caption } = await ai.rewriteCaption({
      brandName: "Pablo",
      tone: "sıcak",
      type: "reel",
      current: "Eski metin #pablo",
    });
    expect(caption).not.toBe("Eski metin #pablo");
  });
});

describe("MockAI.analyzeFeed", () => {
  it("returns several Turkish bullet insights", async () => {
    const ai = new MockAI();
    const { insights } = await ai.analyzeFeed({ brandName: "Pablo", handle: "pablo", imageUrls: [] });
    expect(insights.length).toBeGreaterThanOrEqual(3);
    expect(insights.some((i) => i.toLowerCase().includes("ton"))).toBe(true);
  });
});
