"use client";

import { useState } from "react";
import type { Annotation, Comment, PlanItem } from "@/lib/types";
import { trDateParts } from "@/lib/format";
import { ITEM_TYPE_LABELS } from "@/lib/labels";
import { ItemCard, type ItemStatus } from "./ItemCard";

const BASE_WIDTH = 640;
const ZOOM_STEPS = [60, 80, 100, 120, 140];

/** Groups keep the items' existing order — one date header per day, not per item. */
function groupByDate(items: PlanItem[]): [string, PlanItem[]][] {
  const order: string[] = [];
  const map = new Map<string, PlanItem[]>();
  for (const item of items) {
    if (!map.has(item.date)) {
      map.set(item.date, []);
      order.push(item.date);
    }
    map.get(item.date)!.push(item);
  }
  return order.map((date) => [date, map.get(date)!]);
}

export function TimelineView({
  items,
  statuses,
  comments,
  annotations,
  onComment,
  onAnnotate,
  onDeleteAnnotation,
  onStatus,
}: {
  items: PlanItem[];
  statuses: Record<string, ItemStatus>;
  comments: Comment[];
  annotations: Annotation[];
  onComment: (itemId: string, body: string) => void;
  onAnnotate: (itemId: string, mediaIndex: number, xPct: number, yPct: number, note: string) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onStatus: (itemId: string, status: ItemStatus) => void;
}) {
  const [zoomIdx, setZoomIdx] = useState(2); // 100%
  const zoom = ZOOM_STEPS[zoomIdx];
  const groups = groupByDate(items);

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-6">
      <div className="flex items-center gap-2 self-end">
        <button
          type="button"
          aria-label="Uzaklaştır"
          onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
          disabled={zoomIdx === 0}
          className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border-strong)] text-[14px] font-semibold text-[var(--text-dim)] disabled:opacity-40"
        >
          −
        </button>
        <span className="w-9 text-center text-[11.5px] text-[var(--text-mute)]">{zoom}%</span>
        <button
          type="button"
          aria-label="Yakınlaştır"
          onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          disabled={zoomIdx === ZOOM_STEPS.length - 1}
          className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border-strong)] text-[14px] font-semibold text-[var(--text-dim)] disabled:opacity-40"
        >
          +
        </button>
      </div>

      <div className="flex w-full flex-col gap-6" style={{ maxWidth: (BASE_WIDTH * zoom) / 100 }}>
        {groups.map(([date, dayItems]) => {
          const d = trDateParts(date);
          return (
            <div key={date} className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2 border-b border-[var(--border)] pb-1.5">
                <span className="font-[family-name:var(--font-display)] text-[19px] font-semibold">{d.day}</span>
                <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-mute)]">{d.month}</span>
                <span className="text-[11.5px] text-[var(--text-mute)]">{d.weekday}</span>
                <span className="ml-auto text-[11px] text-[var(--text-mute)]">
                  {dayItems.map((i) => ITEM_TYPE_LABELS[i.type]).join(" · ")}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {dayItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    status={statuses[item.id] ?? "none"}
                    comments={comments}
                    annotations={annotations}
                    onComment={onComment}
                    onAnnotate={onAnnotate}
                    onDeleteAnnotation={onDeleteAnnotation}
                    onStatus={onStatus}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
