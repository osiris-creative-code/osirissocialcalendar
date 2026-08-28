"use client";

import type { Annotation, Comment, PlanItem } from "@/lib/types";
import { trDayMonth } from "@/lib/format";
import { ItemCard, type ItemStatus } from "./ItemCard";

export function GridView({
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
  const stories = items.filter((i) => i.type === "story");
  const feed = items.filter((i) => i.type !== "story");

  return (
    <div className="flex flex-col gap-6">
      {stories.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-mute)]">
            Story akışı
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {stories.map((s) => (
              <div key={s.id} className="w-24 shrink-0 text-center">
                <div className="relative aspect-[9/16] overflow-hidden rounded-[14px] border border-[var(--border)]">
                  {s.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.media[0].url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center bg-[var(--surface-2)] text-[10px] text-[var(--text-mute)]">
                      görsel yok
                    </div>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-black/45 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-white">
                    STORY
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-[var(--text-mute)]">{trDayMonth(s.date)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {feed.map((item) => (
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
}
