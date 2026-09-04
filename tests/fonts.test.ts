import { describe, it, expect } from "vitest";
import { foldTurkish, textForFont, fontFaceCss } from "@/lib/fonts";
import type { FontAsset } from "@/lib/types";

const font = (over: Partial<FontAsset>): FontAsset => ({
  id: "f1",
  name: "Gilroy",
  family: "Gilroy",
  url: "/u/gilroy.woff2",
  supportsTurkish: true,
  uploadedAt: "2026-09-01T00:00:00Z",
  ...over,
});

describe("foldTurkish", () => {
  it("maps every Turkish-only letter to its ASCII shape", () => {
    expect(foldTurkish("ŞİÇÖĞÜ şiçöğü")).toBe("SICOGU sicogu");
  });

  it("leaves everything else alone", () => {
    expect(foldTurkish("Rafine Coffee 2026 — #kahve")).toBe("Rafine Coffee 2026 — #kahve");
  });
});

describe("textForFont", () => {
  it("keeps the Turkish spelling when the font can show it", () => {
    expect(textForFont("Güzel Şeyler", font({ supportsTurkish: true }))).toBe("Güzel Şeyler");
  });

  it("folds when the font would fall back mid-word", () => {
    expect(textForFont("Güzel Şeyler", font({ supportsTurkish: false }))).toBe("Guzel Seyler");
  });

  it("leaves text untouched when no brand font is set", () => {
    expect(textForFont("Güzel Şeyler", null)).toBe("Güzel Şeyler");
  });
});

describe("fontFaceCss", () => {
  it("emits one rule per distinct face and skips the blanks", () => {
    const css = fontFaceCss([font({}), null, font({})]);
    expect(css.match(/@font-face/g)).toHaveLength(1);
    expect(css).toContain('font-family:"Gilroy"');
    expect(css).toContain("font-display:swap");
  });
});
