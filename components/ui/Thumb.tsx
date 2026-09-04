"use client";

import { useState } from "react";
import type { Media } from "@/lib/types";

/**
 * A safe thumbnail `<img>` for any `Media` entry.
 *
 * Two failure modes this exists to close:
 *
 * 1. A reel's `media.url` is a video file or a Drive `/preview` iframe page —
 *    never something an `<img>` tag can decode. Putting it straight into
 *    `src` (as several places used to) is a guaranteed broken image, not an
 *    occasional one. This picks `posterUrl` for anything that isn't a plain
 *    image, and shows a neutral placeholder rather than a broken-image icon
 *    when there isn't one.
 * 2. A perfectly valid image URL can still fail once — a storage hiccup, a
 *    slow cold start, a transient network blip — and a bare `<img>` never
 *    recovers from that on its own. This retries once with a cache-busting
 *    query param before giving up and showing the placeholder.
 */
export function Thumb({
  media,
  alt = "",
  className = "",
}: {
  media: Pick<Media, "url" | "kind" | "posterUrl"> | null | undefined;
  alt?: string;
  className?: string;
}) {
  const base = media ? media.posterUrl ?? (media.kind === "image" ? media.url : null) : null;
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (!base || failed) {
    return (
      <span
        aria-label={base ? "Görsel yüklenemedi" : "Görsel yok"}
        className={`grid place-items-center bg-[var(--surface-2)] text-[var(--text-mute)] ${className}`}
      >
        <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.4" />
          <path d="M21 15.5 16.5 11 6 21" />
        </svg>
      </span>
    );
  }

  const src = attempt === 0 ? base : `${base}${base.includes("?") ? "&" : "?"}retry=${attempt}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (attempt < 1) setAttempt((a) => a + 1);
        else setFailed(true);
      }}
    />
  );
}
