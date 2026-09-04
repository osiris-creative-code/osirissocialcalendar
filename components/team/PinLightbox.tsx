"use client";

import type { Annotation, Media } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

/**
 * The marked-up image at a size you can actually read — the row thumbnail is
 * too small to see where a pin sits. Read-only: the team looks at the brand's
 * pins here, it doesn't add or delete them.
 */
export function PinLightbox({
  open,
  onClose,
  media,
  pins,
  title,
}: {
  open: boolean;
  onClose: () => void;
  media: Media | null;
  pins: Annotation[];
  title: string;
}) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="pin-lightbox-title" size="lg">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 id="pin-lightbox-title" className="text-[14px] font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-md px-2 py-0.5 text-[16px] leading-none text-[var(--text-mute)] hover:text-[var(--text)]"
          >
            ×
          </button>
        </div>

        {media ? (
          <div className="relative overflow-hidden rounded-[var(--r-md)] border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.url} alt="" className="block w-full" />
            {pins.map((pin, i) => (
              <span
                key={pin.id}
                title={pin.note}
                data-testid="lightbox-pin"
                className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-full place-items-center rounded-[50%_50%_50%_2px] bg-[var(--accent)] text-[12px] font-bold text-white shadow"
                style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
              >
                {i + 1}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--text-mute)]">Görsel bulunamadı.</p>
        )}

        <ul className="flex flex-col gap-1.5 text-[12.5px] text-[var(--text-dim)]">
          {pins.map((pin, i) => (
            <li key={pin.id}>
              <b className="text-[var(--accent)]">#{i + 1}</b> {pin.note}
              <span className="text-[var(--text-mute)]"> — {pin.authorName}</span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
