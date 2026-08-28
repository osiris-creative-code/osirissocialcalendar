import { describe, it, expect } from "vitest";
import { MockAI } from "@/lib/ai/mock";

describe("MockAI", () => {
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
});
