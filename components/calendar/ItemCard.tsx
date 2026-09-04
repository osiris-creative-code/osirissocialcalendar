"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Annotation, Comment, PlanItem } from "@/lib/types";
import { trDayMonth } from "@/lib/format";
import { ITEM_TYPE_LABELS as CHIP_LABEL } from "@/lib/labels";
import { ITEM_TYPE_CHIP } from "@/lib/item-type";
import { ITEM_TYPE_ICONS, CheckIcon, ReviseIcon } from "@/components/ui/icons";
import { spring } from "@/lib/motion";
import { Carousel } from "./Carousel";
import { ReelPlayer } from "./ReelPlayer";
import { PinLayer } from "./PinLayer";
import { Thumb } from "@/components/ui/Thumb";

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

  const TypeIcon = ITEM_TYPE_ICONS[item.type];

  // A one-shot reaction when the verdict changes, so approving feels like
  // something happened to the content rather than to a button.
  const [flash, setFlash] = useState<ItemStatus | null>(null);
  const prevStatus = useRef(status);
  useEffect(() => {
    if (status !== prevStatus.current && status !== "none") {
      setFlash(status);
      const t = setTimeout(() => setFlash(null), 900);
      prevStatus.current = status;
      return () => clearTimeout(t);
    }
    prevStatus.current = status;
  }, [status]);

  const noFile = item.placeholder || (item.media[0]?.kind === "video" && !item.media[0].url);

  const media = noFile ? (
    <div className="grid h-full w-full place-items-center gap-1 bg-[var(--surface-2)] px-4 text-center text-[var(--text-dim)]">
      <span className="text-2xl">🎬</span>
      <span className="text-[12.5px] font-semibold">Video hazırlanıyor</span>
      <span className="text-[11px] text-[var(--text-mute)]">yakında bu slota eklenecek</span>
    </div>
  ) : item.media.length ? (
    item.type === "reel" ? (
      <ReelPlayer media={item.media[0]} />
    ) : item.media.length > 1 ? (
      <Carousel media={item.media} onIndexChange={setMediaIndex} />
    ) : (
      <Thumb media={item.media[0]} className="h-full w-full object-cover" />
    )
  ) : (
    <div className="grid h-full w-full place-items-center bg-[var(--surface-2)] text-[12px] text-[var(--text-mute)]">
      görsel yok
    </div>
  );

  return (
    <motion.article
      animate={
        status === "approved"
          ? { borderColor: "color-mix(in srgb, var(--ok) 55%, transparent)" }
          : status === "changes"
            ? { borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)" }
            : { borderColor: "var(--border)" }
      }
      transition={spring}
      className="relative w-full min-w-0 overflow-hidden rounded-[var(--r-lg)] border bg-[var(--surface)]">
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
            style={{
              background:
                flash === "approved"
                  ? "color-mix(in srgb, var(--ok) 22%, transparent)"
                  : "color-mix(in srgb, var(--accent) 22%, transparent)",
            }}
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0, rotate: flash === "changes" ? -25 : 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-lg ${
                flash === "approved" ? "bg-[var(--ok)]" : "bg-[var(--accent)]"
              }`}
            >
              {flash === "approved" ? <CheckIcon size={26} /> : <ReviseIcon size={26} />}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between px-3.5 pt-3">
        <span className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${ITEM_TYPE_CHIP[item.type]}`}>
          <TypeIcon size={13} />
          {CHIP_LABEL[item.type]}
          {item.type === "special" && item.specialLabel ? ` · ${item.specialLabel}` : ""}
        </span>
        <span className="font-mono text-[11.5px] text-[var(--text-mute)]">{trDayMonth(item.date)}</span>
      </div>

      <div
        className={`relative mx-3.5 mt-2.5 overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] ${
          // Reels and stories are both shot vertical (9:16) — matching that box keeps
          // Drive's reel embed from letterboxing/shifting the frame the way a squarer
          // box forces it to, and stops story images from being cropped to a feed shape.
          item.type === "reel" || item.type === "story" ? "aspect-[9/16]" : "aspect-[4/5]"
        }`}
      >
        {media}
        {/* Reels play with a click — a pin layer on top would eat that click. */}
        {item.type !== "reel" && (
          <PinLayer
            annotations={itemAnnotations}
            mediaIndex={mediaIndex}
            onAdd={(mi, x, y, note) => onAnnotate(item.id, mi, x, y, note)}
            onDelete={onDeleteAnnotation}
          />
        )}
      </div>

      {item.caption ? (
        <p className="px-3.5 pt-3 text-[14px] text-[var(--text)]">{item.caption}</p>
      ) : null}

      {showActions ? (
        <div className="mt-3 min-w-0 border-t border-[var(--border)] px-3.5 py-3">
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
            className="flex min-w-0 gap-2"
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
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            />
            <button type="submit" className="shrink-0 rounded-lg bg-[var(--brand)] px-3.5 py-2 text-[13px] font-semibold text-[var(--brand-ink)]">
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
    </motion.article>
  );
}
