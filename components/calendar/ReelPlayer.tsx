"use client";

import { useState } from "react";
import type { Media } from "@/lib/types";

export function ReelPlayer({ media }: { media: Media }) {
  const [playing, setPlaying] = useState(false);
  const isVideo = media.kind === "video" && !!media.url;

  // Real uploaded video → a proper player.
  if (isVideo) {
    return (
      <video
        src={media.url}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full bg-black object-contain"
      />
    );
  }

  // Demo / poster-only fallback (no real video file).
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.url} alt="Reel önizleme" className="h-full w-full object-cover" />
      <span className="absolute left-3 top-3 rounded bg-black/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-white/85">
        Reel
      </span>
      {!playing ? (
        <button
          type="button"
          aria-label="Oynat"
          onClick={(e) => {
            e.stopPropagation();
            setPlaying(true);
          }}
          className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:scale-105"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-black/35 text-center text-[12px] text-white">
          Örnek kare — gerçek video yüklendiğinde burada oynar
        </div>
      )}
    </div>
  );
}
