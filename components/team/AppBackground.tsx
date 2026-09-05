"use client";

import { useEffect } from "react";
import type { BackgroundSettings } from "@/lib/types";

/**
 * The page's backdrop: a flat colour, optionally with a photo faded and blurred
 * over it. Fixed and behind everything, so scrolling does not drag it and no
 * click ever lands on it.
 *
 * Text colour is a separate light/dark theme system (`--text` etc. in
 * globals.css) that otherwise just follows the viewer's own preference —
 * which has nothing to do with whatever background colour got picked here,
 * and can go unreadable (e.g. dark text left on a background just made
 * black). When textTheme is pinned to "light" or "dark" this forces the
 * whole app's text theme to match, overriding the viewer's own toggle.
 */
export function AppBackground({ background }: { background: BackgroundSettings }) {
  const textTheme = background.textTheme ?? "auto";

  useEffect(() => {
    if (textTheme === "auto") return;
    document.documentElement.setAttribute("data-theme", textTheme);
  }, [textTheme]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0" style={{ background: background.color }} />
      {background.imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${background.imageUrl})`,
            opacity: background.opacity / 100,
            filter: background.blur ? `blur(${background.blur}px)` : undefined,
            // Blur samples past the edges; scaling up hides the soft border it leaves.
            transform: background.blur ? "scale(1.06)" : undefined,
          }}
        />
      )}
    </div>
  );
}
