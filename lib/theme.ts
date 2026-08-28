/** CSS custom-property names that make up the Ritim palette (see app/globals.css). */
export const PALETTE_KEYS = [
  "--bg",
  "--surface",
  "--surface-2",
  "--border",
  "--border-strong",
  "--text",
  "--text-dim",
  "--text-mute",
  "--brand",
  "--brand-soft",
  "--brand-ink",
  "--accent",
  "--accent-soft",
  "--gold",
  "--ok",
  "--warn",
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number];
