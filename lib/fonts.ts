import type { AppSettings, Brand, FontAsset } from "@/lib/types";

/** The letters a Turkish brand will notice missing straight away. */
export const TURKISH_TEST = "ŞİÇÖĞÜ şiçöğü";

const FOLD: Record<string, string> = {
  Ş: "S", ş: "s",
  İ: "I", ı: "i",
  Ç: "C", ç: "c",
  Ö: "O", ö: "o",
  Ğ: "G", ğ: "g",
  Ü: "U", ü: "u",
};

/**
 * Strip Turkish-only letters down to their closest ASCII shape.
 *
 * A brand font bought abroad often has no Ş or ğ; the browser then falls back
 * mid-word and the line renders in two different typefaces, which looks worse
 * than losing the cedilla. Applied only to fonts marked as lacking them.
 */
export function foldTurkish(text: string): string {
  return text.replace(/[ŞşİıÇçÖöĞğÜü]/g, (c) => FOLD[c] ?? c);
}

/** Text ready to render in `font` — folded only when the file cannot show it. */
export function textForFont(text: string, font: FontAsset | null): string {
  if (!font || font.supportsTurkish) return text;
  return foldTurkish(text);
}

export function findFont(settings: AppSettings, id: string | null | undefined): FontAsset | null {
  if (!id) return null;
  return settings.fonts.find((f) => f.id === id) ?? null;
}

export type BrandFonts = { heading: FontAsset | null; body: FontAsset | null };

export function brandFonts(settings: AppSettings, brand: Pick<Brand, "headingFontId" | "bodyFontId">): BrandFonts {
  return {
    heading: findFont(settings, brand.headingFontId),
    body: findFont(settings, brand.bodyFontId),
  };
}

/** `@font-face` rules for the faces a page actually uses. */
export function fontFaceCss(fonts: (FontAsset | null)[]): string {
  const seen = new Set<string>();
  return fonts
    .filter((f): f is FontAsset => !!f && !seen.has(f.id) && !!seen.add(f.id))
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";src:url("${f.url}");font-display:swap;}`,
    )
    .join("");
}
