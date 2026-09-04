"use client";

import { useRef, useState } from "react";
import type { Media } from "@/lib/types";

function FullscreenButton({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const [full, setFull] = useState(false);
  return (
    <button
      type="button"
      aria-label="Tam ekran"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          if (!document.fullscreenElement && target.current) {
            await target.current.requestFullscreen();
            setFull(true);
          } else {
            await document.exitFullscreen();
            setFull(false);
          }
        } catch {
          /* fullscreen not available in this browser/context — ignore */
        }
      }}
      className="absolute bottom-2 right-2 z-10 grid h-8 w-8 place-items-center rounded-md bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70"
    >
      {full ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M9 3v4a2 2 0 0 1-2 2H3M15 3v4a2 2 0 0 0 2 2h4M9 21v-4a2 2 0 0 0-2-2H3M15 21v-4a2 2 0 0 1 2-2h4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" />
        </svg>
      )}
    </button>
  );
}

export function ReelPlayer({ media }: { media: Media }) {
  const [playing, setPlaying] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const poster = media.posterUrl || undefined;
  const driveEmbed =
    media.kind === "video" &&
    !!media.url &&
    (media.driveEmbed || /drive\.google\.com\/file\//.test(media.url));
  const notPlayable = media.kind === "video" && media.webPlayable === false && !driveEmbed;
  const isVideo = media.kind === "video" && !!media.url && !notPlayable && !driveEmbed;

  // Big video kept on Google Drive → play through Drive's own embed. Drive picks quality
  // adaptively based on the rendered size — the parent gives it a 9:16 box (real reel shape)
  // instead of a squashed one, and our fullscreen button lets it render at full device size
  // (Drive serves higher resolution the larger the player is), which is as close to "always
  // source quality" as an unauthenticated embed can get.
  if (driveEmbed) {
    return (
      <div ref={boxRef} className="relative h-full w-full bg-black">
        <iframe
          src={media.url}
          title="Reel"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
        <FullscreenButton target={boxRef} />
      </div>
    );
  }

  // Real uploaded video → a proper player (native controls include fullscreen).
  if (isVideo) {
    return (
      <video
        src={media.url}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full bg-black object-contain"
      />
    );
  }

  // A real video file the browser probably can't decode (MOV/AVI/…).
  if (notPlayable) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="Reel önizleme" className="h-full w-full object-cover opacity-80" />
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/45 p-4 text-center text-[12px] text-white">
          Bu video tarayıcıda oynamayabilir — MP4 (H.264) yükleyin.
        </div>
      </div>
    );
  }

  // Demo / poster-only fallback (no real video file).
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster || media.url} alt="Reel önizleme" className="h-full w-full object-cover" />
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
