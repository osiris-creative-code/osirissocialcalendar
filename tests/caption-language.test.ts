import { describe, it, expect, vi, beforeEach } from "vitest";
import { captionLanguageOf, captionLanguageRule } from "@/lib/caption-language";
import type { Brand } from "@/lib/types";
import type { CaptionRequest } from "@/lib/ai/types";

describe("captionLanguageOf", () => {
  it("falls back to Turkish for brands saved before the setting existed", () => {
    expect(captionLanguageOf({} as Brand)).toBe("tr");
  });

  it("uses the brand's own choice when set", () => {
    expect(captionLanguageOf({ captionLanguage: "en" } as Brand)).toBe("en");
  });
});

describe("captionLanguageRule", () => {
  it("tells the model to write English and avoid Turkish", () => {
    expect(captionLanguageRule("en")).toMatch(/İNGİLİZCE/);
    expect(captionLanguageRule("en")).toMatch(/Türkçe kullanma/);
  });

  it("allows a blend for mixed", () => {
    expect(captionLanguageRule("mixed")).toMatch(/İngilizce/);
    expect(captionLanguageRule("mixed")).toMatch(/Türkçe/);
  });

  it("defaults to Turkish", () => {
    expect(captionLanguageRule("tr")).toMatch(/TÜRKÇE/);
  });
});

/* The generator must actually forward the brand's language to the model. */
const captionsSpy = vi.fn(async (_req: CaptionRequest) => ({
  captions: [] as (string | null)[],
}));
vi.mock("@/lib/ai", () => ({
  getAI: () => ({
    captions: captionsSpy,
    rewriteCaption: vi.fn(),
    analyzeFeed: vi.fn(),
    suggestPlan: vi.fn(),
    groupSimilar: vi.fn(),
    reviewCalendar: vi.fn(),
  }),
}));

describe("generate", () => {
  beforeEach(() => captionsSpy.mockClear());

  it("passes the brand's caption language into the caption call", async () => {
    const { POST: createBrand } = await import("@/app/api/brands/route");
    const { POST: createPlan } = await import("@/app/api/plans/route");
    const { POST: generate } = await import("@/app/api/plans/[id]/generate/route");

    const headers = {
      "content-type": "application/json",
      cookie: "ritim_team=1; ritim_actor=Test|yonetici",
    };
    const brandRes = await createBrand(
      new Request("http://t/api/brands", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "EN Marka", colorPrimary: "#000", colorAccent: "#fff" }),
      }),
    );
    const brand = await brandRes.json();

    const { getStore } = await import("@/lib/db");
    await getStore().updateBrand(brand.id, { captionLanguage: "en" });

    const planRes = await createPlan(
      new Request("http://t/api/plans", {
        method: "POST",
        headers,
        body: JSON.stringify({
          brandId: brand.id,
          title: "EN",
          rangeStart: "2026-09-01",
          rangeEnd: "2026-09-02",
          prompt: "her gun post",
        }),
      }),
    );
    const plan = await planRes.json();

    await generate(
      new Request(`http://t/api/plans/${plan.id}/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ mode: "extend" }),
      }),
      { params: Promise.resolve({ id: plan.id }) },
    );

    expect(captionsSpy).toHaveBeenCalled();
    expect(captionsSpy.mock.calls[0][0]).toMatchObject({ language: "en" });
  });
});
