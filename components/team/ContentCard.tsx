"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Annotation, ItemType, PlanItem } from "@/lib/types";
import { ITEM_TYPE_LABELS } from "@/lib/labels";
import { riseIn, spring } from "@/lib/motion";
import { CaptionField } from "./CaptionField";

const CHIP_CLASS: Record<ItemType, string> = {
  post: "bg-[var(--brand-soft)] text-[var(--brand)]",
  story: "bg-[var(--surface-2)] text-[var(--text-dim)]",
  reel: "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]",
  special: "bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] text-[var(--warn)]",
};

/** Media-first card: on a content calendar the picture is the point, not the row. */
export const ContentCard = memo(function ContentCard({
  row,
  pins,
  highlighted,
  onCaption,
  onRemove,
  onOpenPins,
}: {
  row: PlanItem;
  pins: Annotation[];
  highlighted: boolean;
  onCaption: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
  onOpenPins: (id: string, mediaIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const media = row.media[0];
  const firstPinMedia = useMemo(() => (pins.length ? pins[0].mediaIndex : null), [pins]);

  return (
    <motion.li
      ref={setNodeRef}
      id={`plan-item-${row.id}`}
      layout
      variants={riseIn}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      whileHover={{ y: -3, transition: spring }}
      className={`group relative flex flex-col overflow-hidden rounded-[var(--r-md)] border bg-[var(--surface)] ${
        row.isGap
          ? "border-[color-mix(in_srgb,var(--warn)_50%,transparent)]"
          : "border-[var(--border)] hover:border-[color-mix(in_srgb,var(--brand)_55%,transparent)]"
      } ${highlighted ? "ring-2 ring-[var(--accent)]" : ""} ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Drag surface — the whole media area, so the card feels grabbable. */}
      <button
        type="button"
        aria-label="Sürükle"
        {...attributes}
        {...listeners}
        className={`relative w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing ${
          row.type === "reel" ? "aspect-[9/16]" : "aspect-[4/5]"
        }`}
      >
        {media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            src={media.url}
            alt=""
            className="h-full w-full object-cover"
            whileHover={{ scale: 1.06 }}
            transition={spring}
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-[var(--surface-2)] text-[11.5px] text-[var(--text-mute)]">
            {row.isGap ? "içerik eksik" : "görsel yok"}
          </span>
        )}

        <span
          className={`pointer-events-none absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${CHIP_CLASS[row.type]}`}
        >
          {ITEM_TYPE_LABELS[row.type]}
        </span>
      </button>

      {/* Pin badge — opens the marked-up image full size. */}
      {pins.length > 0 && firstPinMedia !== null && (
        <motion.button
          type="button"
          aria-label="İşaretli görseli büyüt"
          onClick={() => onOpenPins(row.id, firstPinMedia)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={spring}
          whileHover={{ scale: 1.12 }}
          className="absolute right-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold text-white shadow"
        >
          {pins.length}
        </motion.button>
      )}

      {/* Delete — only on hover/focus, so the card stays clean. */}
      <motion.button
        type="button"
        aria-label="Kaldır"
        onClick={() => onRemove(row.id)}
        initial={false}
        className="absolute bottom-[max(3.4rem,30%)] right-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--bg)]/85 text-[13px] text-[var(--text-mute)] opacity-0 backdrop-blur transition-opacity hover:text-[var(--accent)] focus:opacity-100 group-hover:opacity-100"
      >
        ×
      </motion.button>

      <div className="flex flex-col gap-1 p-2.5">
        {row.type === "story" ? (
          <span className="text-[11.5px] text-[var(--text-mute)]">açıklama yok</span>
        ) : (
          <CaptionField
            id={row.id}
            label={`${ITEM_TYPE_LABELS[row.type]} açıklaması`}
            value={row.caption ?? ""}
            onCommit={onCaption}
            rows={2}
            placeholder="açıklama…"
            className="w-full resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-[12px] leading-[1.35] text-[var(--text-dim)] focus:border-[var(--border)] focus:bg-[var(--bg)] focus:text-[var(--text)]"
          />
        )}
      </div>
    </motion.li>
  );
});
