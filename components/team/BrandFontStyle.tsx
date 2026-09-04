import type { AppSettings, Brand } from "@/lib/types";
import { brandFonts, fontFaceCss } from "@/lib/fonts";

/**
 * Loads a brand's chosen faces and points the display/body variables at them,
 * so every heading and paragraph inside picks them up without each component
 * knowing anything about fonts.
 */
export function BrandFontStyle({
  settings,
  brand,
  scope = ":root",
}: {
  settings: AppSettings;
  brand: Pick<Brand, "headingFontId" | "bodyFontId">;
  /** CSS selector the variables are bound to. */
  scope?: string;
}) {
  const { heading, body } = brandFonts(settings, brand);
  if (!heading && !body) return null;

  const vars = [
    heading && `--font-display:"${heading.family}";`,
    body && `--font-sans:"${body.family}";`,
  ]
    .filter(Boolean)
    .join("");

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `${fontFaceCss([heading, body])}${scope}{${vars}}`,
      }}
    />
  );
}
