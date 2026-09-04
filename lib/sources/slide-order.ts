/**
 * Derive a carousel slide index from a file name.
 * "post-kaydirmali 2.jpg" -> 2 ; "story_03.png" -> 3 ; "hero.jpg" -> null.
 */
export function slideOrderFromName(name: string): number | null {
  const base = name.replace(/\.[a-z0-9]+$/i, "").trim();

  const carousel = /kayd[ıi]rmal[ıi]\s*(\d+)\s*$/i.exec(base);
  if (carousel) return Number(carousel[1]);

  const trailing = /[_\s-]?(\d+)\s*$/.exec(base);
  if (trailing) return Number(trailing[1]);

  return null;
}

/**
 * Whether a name explicitly asks to be part of a carousel.
 *
 * Only the documented "kaydırmalı N" convention counts. A bare trailing number
 * is just how cameras name files (IMG_2201, IMG_2202…) — treating that as a
 * carousel silently welded whole shoots into one giant post. Runs like that are
 * now surfaced as a *suggestion* by the shoot analysis instead.
 */
export function isCarouselName(name: string): boolean {
  return /kayd[ıi]rmal[ıi]\s*\d+\s*$/i.test(name.replace(/\.[a-z0-9]+$/i, "").trim());
}
