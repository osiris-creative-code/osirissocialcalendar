"use client";

import { useRef, useState } from "react";
import type { Media } from "@/lib/types";

/** Fraction of the frame's width a swipe must cover to change slides. */
const SWIPE_THRESHOLD = 0.18;

export function Carousel({
  media,
  onIndexChange,
}: {
  media: Media[];
  onIndexChange?: (index: number) => void;
}) {
  const [pos, setPos] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  // `dx` lives on this ref, not in state: a fast flick can fire pointerup in the
  // same tick as the last pointermove, before React has re-rendered — reading
  // dragPx (state) from endDrag in that case sees the value from one gesture
  // ago, not this one, which was silently eating real swipes.
  const drag = useRef<{ startX: number; startY: number; axis: "x" | "y" | null; dx: number } | null>(
    null,
  );
  const n = media.length;

  const go = (delta: number) => {
    const next = (pos + delta + n) % n;
    setPos(next);
    onIndexChange?.(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (n <= 1 || e.pointerType === "mouse") return; // desktop uses the arrow buttons
    drag.current = { startX: e.clientX, startY: e.clientY, axis: null, dx: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;

    // Decide once whether this gesture is a horizontal swipe or a vertical
    // page scroll — committing early stops it from doing a bit of both.
    if (!drag.current.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (drag.current.axis !== "x") return;

    e.preventDefault(); // this gesture is ours now — the page must not scroll with it
    drag.current.dx = dx;
    setDragPx(dx); // state only drives the visual transform below
  };

  const endDrag = () => {
    if (!drag.current) return;
    const { axis, dx } = drag.current;
    const width = frameRef.current?.clientWidth || 1;
    if (axis === "x" && Math.abs(dx) / width > SWIPE_THRESHOLD) {
      go(dx < 0 ? 1 : -1);
    }
    drag.current = null;
    setDragPx(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (n <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  const offsetPct = -pos * 100 + (dragPx / (frameRef.current?.clientWidth || 1)) * 100;

  return (
    <div
      ref={frameRef}
      role={n > 1 ? "group" : undefined}
      aria-roledescription={n > 1 ? "kaydırmalı gönderi" : undefined}
      aria-label={n > 1 ? `${pos + 1} / ${n}` : undefined}
      tabIndex={n > 1 ? 0 : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative h-full w-full touch-pan-y overflow-hidden outline-none"
    >
      <div
        className={`flex h-full ${drag.current ? "" : "transition-transform duration-300 ease-out"}`}
        style={{ transform: `translateX(${offsetPct}%)` }}
      >
        {media.map((m, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={m.url}
            alt={`Slayt ${i + 1}`}
            draggable={false}
            className="h-full w-full flex-[0_0_100%] select-none object-cover"
          />
        ))}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Önceki"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Sonraki"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}. slayta git`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPos(i);
                  onIndexChange?.(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === pos ? "w-4 bg-white" : "w-1.5 bg-white/45"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
