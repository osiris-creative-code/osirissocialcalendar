"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function seenBefore(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function Splash({
  brandName,
  logoUrl,
  colorPrimary,
  title,
  onDone,
  storageKey,
}: {
  brandName: string;
  logoUrl: string;
  colorPrimary: string;
  title: string;
  onDone: () => void;
  storageKey: string;
}) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const quick = prefersReducedMotion() || seenBefore(storageKey);
    const hold = quick ? 800 : 3500;
    const fade = 400;

    const t1 = setTimeout(() => setFading(true), hold);
    const t2 = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
      onDone();
    }, hold + fade);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone, storageKey]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[80] grid place-items-center px-6 text-center transition-opacity duration-[400ms]"
      style={{ background: colorPrimary, opacity: fading ? 0 : 1 }}
    >
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={brandName}
          className="mx-auto mb-5 h-20 w-20 rounded-2xl object-cover shadow-lg"
        />
        <div className="font-[family-name:var(--font-display)] text-3xl font-semibold text-white">
          {brandName}
        </div>
        <div className="mx-auto mt-2 max-w-xs text-[13px] text-white/80">{title}</div>
      </div>
    </div>
  );
}
