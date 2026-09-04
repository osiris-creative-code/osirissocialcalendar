"use client";

import { useEffect } from "react";

/**
 * A warm light that follows the pointer.
 *
 * Written straight to CSS custom properties on rAF rather than through React
 * state — the pointer fires far more often than a component should re-render,
 * and this keeps typing and dragging untouched by it.
 */
export function CursorGlow() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return; // no cursor to follow

    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      document.documentElement.style.setProperty("--cursor-x", `${x}px`);
      document.documentElement.style.setProperty("--cursor-y", `${y}px`);
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div aria-hidden className="cursor-glow" />;
}
