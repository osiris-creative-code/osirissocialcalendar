"use client";

import type { Annotation, Comment, PlanItem } from "@/lib/types";
import { trDateParts } from "@/lib/format";
import { ItemCard, type ItemStatus } from "./ItemCard";

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
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4">
      {items.map((item) => {
        const d = trDateParts(item.date);
        return (
          <div key={item.id} className="grid grid-cols-[54px_1fr] gap-4">
            <div className="border-r border-[var(--border)] pt-1 text-center">
              <span className="block font-[family-name:var(--font-display)] text-[24px] font-semibold leading-none">
                {d.day}
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--text-mute)]">
                {d.month}
              </span>
              <span className="mt-1.5 block text-[10px] text-[var(--text-dim)]">{d.weekday}</span>
            </div>
            <ItemCard
              item={item}
              status={statuses[item.id] ?? "none"}
              comments={comments}
              annotations={annotations}
              onComment={onComment}
              onAnnotate={onAnnotate}
              onDeleteAnnotation={onDeleteAnnotation}
              onStatus={onStatus}
            />
          </div>
        );
      })}
    </div>
  );
}
