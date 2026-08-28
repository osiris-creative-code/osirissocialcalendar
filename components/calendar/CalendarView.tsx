"use client";

import { useEffect, useState } from "react";
import type { Annotation, Comment, PlanItem } from "@/lib/types";
import { GridView } from "./GridView";
import { TimelineView } from "./TimelineView";
import type { ItemStatus } from "./ItemCard";

export type CalendarMode = "brand" | "internal";
type ViewMode = "grid" | "timeline";
const STORE_KEY = "ritim-view-mode";

export function CalendarView({
  brand,
  items,
  mode,
  comments,
  annotations,
  initialStatuses = {},
  onComment,
  onAnnotate,
  onDeleteAnnotation,
  onStatus,
}: {
  plan: { id: string; title: string };
  brand: { id: string; name: string; logoUrl: string; colorPrimary: string; colorAccent: string };
  items: PlanItem[];
  mode: CalendarMode;
  comments: Comment[];
  annotations: Annotation[];
  initialStatuses?: Record<string, ItemStatus>;
  onComment: (itemId: string, body: string) => void;
  onAnnotate: (itemId: string, mediaIndex: number, xPct: number, yPct: number, note: string) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onStatus: (itemId: string, status: ItemStatus) => void;
}) {
  const [view, setView] = useState<ViewMode>("grid");
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>(initialStatuses);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved === "grid" || saved === "timeline") setView(saved);
    } catch {
      /* private mode / disabled storage */
    }
  }, []);

  const pick = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(STORE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const handleStatus = (itemId: string, status: ItemStatus) => {
    setStatuses((s) => ({ ...s, [itemId]: status }));
    onStatus(itemId, status);
  };

  const visible = items.filter((i) => !i.hidden && !i.isGap).sort((a, b) => a.sort - b.sort);
  const shared = {
    items: visible,
    statuses,
    comments,
    annotations,
    onComment,
    onAnnotate,
    onDeleteAnnotation,
    onStatus: handleStatus,
  };

  return (
    <div data-calendar-mode={mode} style={{ ["--brand" as string]: brand.colorPrimary }}>
      <div className="mb-4 inline-flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
        <button
          type="button"
          aria-pressed={view === "grid"}
          onClick={() => pick("grid")}
          className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
            view === "grid" ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-dim)]"
          }`}
        >
          Izgara
        </button>
        <button
          type="button"
          aria-pressed={view === "timeline"}
          onClick={() => pick("timeline")}
          className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
            view === "timeline" ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-dim)]"
          }`}
        >
          Zaman çizelgesi
        </button>
      </div>

      {view === "grid" ? <GridView {...shared} /> : <TimelineView {...shared} />}
    </div>
  );
}
