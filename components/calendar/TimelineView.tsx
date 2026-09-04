"use client";

import { useState } from "react";
import type { Annotation, Comment, PlanItem } from "@/lib/types";
import { trDateParts } from "@/lib/format";
import { ITEM_TYPE_LABELS } from "@/lib/labels";
import { ItemCard, type ItemStatus } from "./ItemCard";

type Density = "normal" | "compact";

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
  const [density, setDensity] = useState<Density>("normal");
  const groups = groupByDate(items);
  const compact = density === "compact";

  return (
    <div className={`mx-auto flex w-full flex-col gap-6 ${compact ? "max-w-[980px]" : "max-w-[640px]"}`}>
      <div className="flex items-center justify-end gap-2">
        <span className="text-[11.5px] text-[var(--text-mute)]">Görünüm</span>
        <div className="inline-flex rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-0.5">
          {(["normal", "compact"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDensity(d)}
              className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${
                density === d
                  ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                  : "text-[var(--text-dim)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {d === "normal" ? "Büyük" : "Kompakt (uzaklaştır)"}
            </button>
          ))}
        </div>
      </div>

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
            <div
              className={
                compact
                  ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                  : "flex flex-col gap-4"
              }
            >
              {dayItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  compact={compact}
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
  );
}
