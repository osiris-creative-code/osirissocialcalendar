import type { ItemType } from "@/lib/types";

/**
 * One place deciding how a content type looks. Both the team calendar and the
 * brand-facing grid read from here, so a post is the same blue everywhere.
 */
export const ITEM_TYPE_CHIP: Record<ItemType, string> = {
  post: "bg-[var(--type-post-soft)] text-[var(--type-post)]",
  story: "bg-[var(--type-story-soft)] text-[var(--type-story)]",
  reel: "bg-[var(--type-reel-soft)] text-[var(--type-reel)]",
  special: "bg-[var(--type-special-soft)] text-[var(--type-special)]",
};

/** Just the ink, for icons and text that sit on their own background. */
export const ITEM_TYPE_INK: Record<ItemType, string> = {
  post: "text-[var(--type-post)]",
  story: "text-[var(--type-story)]",
  reel: "text-[var(--type-reel)]",
  special: "text-[var(--type-special)]",
};

/** Border tint, for cards that want to carry the type colour. */
export const ITEM_TYPE_BORDER: Record<ItemType, string> = {
  post: "border-[color-mix(in_srgb,var(--type-post)_45%,transparent)]",
  story: "border-[color-mix(in_srgb,var(--type-story)_45%,transparent)]",
  reel: "border-[color-mix(in_srgb,var(--type-reel)_45%,transparent)]",
  special: "border-[color-mix(in_srgb,var(--type-special)_45%,transparent)]",
};
