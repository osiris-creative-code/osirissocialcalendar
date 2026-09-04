import { describe, it, expect } from "vitest";
import { DICT, translate } from "@/lib/i18n/dict";

describe("translations", () => {
  it("covers the same keys in both languages", () => {
    expect(Object.keys(DICT.en).sort()).toEqual(Object.keys(DICT.tr).sort());
  });

  it("returns the language asked for", () => {
    expect(translate("tr", "nav.brands")).toBe("Markalar");
    expect(translate("en", "nav.brands")).toBe("Brands");
  });

  it("has no empty strings", () => {
    for (const [lang, entries] of Object.entries(DICT)) {
      for (const [key, value] of Object.entries(entries)) {
        expect(value, `${lang}.${key}`).not.toBe("");
      }
    }
  });
});
