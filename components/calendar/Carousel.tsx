"use client";

import { useState } from "react";
import type { Media } from "@/lib/types";

export function Carousel({
  media,
  onIndexChange,
}: {
  media: Media[];
  onIndexChange?: (index: number) => void;
}) {
  const [pos, setPos] = useState(0);
  const n = media.length;

  const go = (delta: number) => {
    const next = (pos + delta + n) % n;
    setPos(next);
    onIndexChange?.(next);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${-pos * 100}%)` }}
      >
        {media.map((m, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={m.url}
            alt={`Slayt ${i + 1}`}
            className="h-full w-full flex-[0_0_100%] object-cover"
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
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
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
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {media.map((_, i) => (
              <span
                key={i}
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
