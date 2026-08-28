"use client";

import { useMemo, useState } from "react";
import type { Annotation, Comment, ItemType, PlanItem } from "@/lib/types";
import { trDayMonth } from "@/lib/format";
import { Carousel } from "./Carousel";
import { ReelPlayer } from "./ReelPlayer";
import { PinLayer } from "./PinLayer";

const CHIP_LABEL: Record<ItemType, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
  special: "Güne Özel",
};

const CHIP_CLASS: Record<ItemType, string> = {
  post: "bg-[var(--brand-soft)] text-[var(--brand)]",
  story: "bg-[var(--surface-2)] text-[var(--text-dim)]",
  reel: "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]",
  special: "bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] text-[var(--warn)]",
};

export type ItemStatus = "none" | "approved" | "changes";

export function ItemCard({
  item,
  annotations,
  comments,
  status,
  onComment,
  onAnnotate,
  onDeleteAnnotation,
  onStatus,
  showActions = true,
}: {
  item: PlanItem;
  annotations: Annotation[];
  comments: Comment[];
  status: ItemStatus;
  onComment: (itemId: string, body: string) => void;
  onAnnotate: (itemId: string, mediaIndex: number, xPct: number, yPct: number, note: string) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onStatus: (itemId: string, status: ItemStatus) => void;
  showActions?: boolean;
}) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const itemAnnotations = useMemo(
    () => annotations.filter((a) => a.planItemId === item.id),
    [annotations, item.id],
  );
  const itemComments = comments.filter((c) => c.planItemId === item.id);

  const media = item.media.length ? (
    item.type === "reel" ? (
      <ReelPlayer media={item.media[0]} />
    ) : item.media.length > 1 ? (
      <Carousel media={item.media} onIndexChange={setMediaIndex} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.media[0].url} alt="" className="h-full w-full object-cover" />
    )
  ) : (
    <div className="grid h-full w-full place-items-center bg-[var(--surface-2)] text-[12px] text-[var(--text-mute)]">
      görsel yok
    </div>
  );

  return (
    <article className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between px-3.5 pt-3">
        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${CHIP_CLASS[item.type]}`}>
          {CHIP_LABEL[item.type]}
          {item.type === "special" && item.specialLabel ? ` · ${item.specialLabel}` : ""}
        </span>
        <span className="font-mono text-[11.5px] text-[var(--text-mute)]">{trDayMonth(item.date)}</span>
      </div>

      <div className="relative mx-3.5 mt-2.5 aspect-[4/5] overflow-hidden rounded-[var(--r-md)] border border-[var(--border)]">
        {media}
        <PinLayer
          annotations={itemAnnotations}
          mediaIndex={mediaIndex}
          onAdd={(mi, x, y, note) => onAnnotate(item.id, mi, x, y, note)}
          onDelete={onDeleteAnnotation}
        />
      </div>

      {item.caption ? (
        <p className="px-3.5 pt-3 text-[14px] text-[var(--text)]">{item.caption}</p>
      ) : null}

      {showActions ? (
        <div className="mt-3 border-t border-[var(--border)] px-3.5 py-3">
          <div className="mb-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => onStatus(item.id, status === "approved" ? "none" : "approved")}
              className={`flex-1 rounded-lg border px-2 py-2 text-[12.5px] font-semibold transition ${
                status === "approved"
                  ? "border-[color-mix(in_srgb,var(--ok)_45%,transparent)] bg-[var(--ok-soft)] text-[var(--ok)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-dim)]"
              }`}
            >
              ✓ Onayla
            </button>
            <button
              type="button"
              onClick={() => onStatus(item.id, status === "changes" ? "none" : "changes")}
              className={`flex-1 rounded-lg border px-2 py-2 text-[12.5px] font-semibold transition ${
                status === "changes"
                  ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-dim)]"
              }`}
            >
              ↺ Revize iste
            </button>
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onComment(item.id, draft.trim());
              setDraft("");
            }}
          >
            <input
              aria-label="Yorum"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Yorum ekle…"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            />
            <button type="submit" className="rounded-lg bg-[var(--brand)] px-3.5 py-2 text-[13px] font-semibold text-[var(--brand-ink)]">
              Gönder
            </button>
          </form>

          {itemComments.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {itemComments.map((c) => (
                <li key={c.id} className="border-l-2 border-[var(--brand-soft)] pl-3 text-[12.5px] text-[var(--text-dim)]">
                  <b className="text-[var(--text)]">{c.authorName}</b> {c.body}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </article>
  );
}
