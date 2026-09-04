import type { BackgroundSettings } from "@/lib/types";

/**
 * The page's backdrop: a flat colour, optionally with a photo faded and blurred
 * over it. Fixed and behind everything, so scrolling does not drag it and no
 * click ever lands on it.
 */
export function AppBackground({ background }: { background: BackgroundSettings }) {
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
