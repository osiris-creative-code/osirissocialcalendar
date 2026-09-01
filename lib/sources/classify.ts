import type { ItemType } from "@/lib/types";

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

/** Guess a slot type from a file name. Deterministic, Turkish-aware. */
export function typeFromName(name: string): ItemType {
  const n = name.toLocaleLowerCase("tr");
  if (/(^|[^a-z])reel|reels/.test(n) || VIDEO_EXT.test(n)) return "reel";
  if (n.includes("story") || n.includes("hikaye") || n.includes("hikâye")) return "story";
  if (n.includes("ozel") || n.includes("özel") || n.includes("special")) return "special";
  return "post";
}

export function kindFromMime(mimeType: string): "image" | "video" {
  return mimeType.startsWith("video/") ? "video" : "image";
}
