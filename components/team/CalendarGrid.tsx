"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Annotation, ItemType, PlanItem } from "@/lib/types";
import { ITEM_TYPE_LABELS } from "@/lib/labels";
import { WEEKDAY_HEADERS, type DayCell } from "@/lib/planner/calendar";
import { spring } from "@/lib/motion";

const CHIP_CLASS: Record<ItemType, string> = {
  post: "bg-[var(--brand-soft)] text-[var(--brand)]",
  story: "bg-[var(--surface-2)] text-[var(--text-dim)]",
  reel: "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]",
  special: "bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] text-[var(--warn)]",
};

/**
 * The plan as a month grid — seven columns, a row per week, nothing off screen
 * sideways. Cells are compact on purpose: you are scanning the shape of the
 * month here, and opening an item for detail.
 */
export function CalendarGrid({
  weeks,
  pinsByItem,
  highlightItemId,
  onOpenItem,
  onOpenPins,
}: {
  weeks: DayCell[][];
  pinsByItem: Map<string, Annotation[]>;
  highlightItemId?: string | null;
  onOpenItem: (id: string) => void;
  onOpenPins: (id: string, mediaIndex: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--border)]">
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)]">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-center text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--text-mute)]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((cell) => (
          <DayCellView
            key={cell.date}
            cell={cell}
            pinsByItem={pinsByItem}
            highlightItemId={highlightItemId}
            onOpenItem={onOpenItem}
            onOpenPins={onOpenPins}
          />
        ))}
      </div>
    </div>
  );
}

function DayCellView({
  cell,
  pinsByItem,
  highlightItemId,
  onOpenItem,
  onOpenPins,
}: {
  cell: DayCell;
  pinsByItem: Map<string, Annotation[]>;
  highlightItemId?: string | null;
  onOpenItem: (id: string) => void;
  onOpenPins: (id: string, mediaIndex: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${cell.date}` });

  return (
    <div
      ref={setNodeRef}
      data-date={cell.date}
      className={`min-h-[104px] border-b border-r border-[var(--border)] p-1.5 transition-colors ${
        cell.inRange ? "" : "bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] opacity-45"
      } ${isOver ? "bg-[var(--brand-soft)]" : ""}`}
    >
      <div className="mb-1 flex items-baseline justify-between px-0.5">
        <span
          className={`font-mono text-[11px] ${
            cell.inRange ? "text-[var(--text-dim)]" : "text-[var(--text-mute)]"
          }`}
        >
          {Number(cell.date.slice(8, 10))}
        </span>
        {cell.inRange && cell.items.length === 0 && (
          <span className="text-[9.5px] uppercase tracking-wide text-[var(--text-mute)]">boş</span>
        )}
      </div>

      <SortableContext items={cell.items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="flex flex-col gap-1">
          {cell.items.map((item) => (
            <DayItem
              key={item.id}
              item={item}
              pins={pinsByItem.get(item.id) ?? []}
              highlighted={item.id === highlightItemId}
              onOpenItem={onOpenItem}
              onOpenPins={onOpenPins}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

const DayItem = memo(function DayItem({
  item,
  pins,
  highlighted,
  onOpenItem,
  onOpenPins,
}: {
  item: PlanItem;
  pins: Annotation[];
  highlighted: boolean;
  onOpenItem: (id: string) => void;
  onOpenPins: (id: string, mediaIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const media = item.media[0];

  return (
    <motion.div
      ref={setNodeRef}
      id={`plan-item-${item.id}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      whileHover={{ scale: 1.03 }}
      transition={spring}
      className={`group relative overflow-hidden rounded-[6px] border ${
        item.isGap
          ? "border-[color-mix(in_srgb,var(--warn)_50%,transparent)]"
          : "border-[var(--border)]"
      } ${highlighted ? "ring-2 ring-[var(--accent)]" : ""} ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        aria-label={`${ITEM_TYPE_LABELS[item.type]} — sürükle`}
        {...attributes}
        {...listeners}
        className="block w-full cursor-grab touch-none active:cursor-grabbing"
      >
        <span className="relative block h-11 w-full">
          {media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="block h-full w-full bg-[var(--surface-2)]" />
          )}
        </span>
        <span
          className={`block truncate px-1 py-0.5 text-left text-[9.5px] font-bold uppercase tracking-wide ${CHIP_CLASS[item.type]}`}
        >
          {ITEM_TYPE_LABELS[item.type]}
        </span>
      </button>

      {pins.length > 0 && (
        <button
          type="button"
          aria-label="İşaretli görseli büyüt"
          onClick={() => onOpenPins(item.id, pins[0].mediaIndex)}
          className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-white"
        >
          {pins.length}
        </button>
      )}

      <button
        type="button"
        aria-label="Aç"
        onClick={() => onOpenItem(item.id)}
        className="absolute inset-x-0 bottom-0 h-4 bg-[var(--bg)]/80 text-[9px] font-semibold text-[var(--brand)] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
      >
        düzenle
      </button>
    </motion.div>
  );
});
