"use client";

import { useRef, useState } from "react";
import type { Annotation, Brand, Comment, CommentStage, Plan, PlanItem, Role } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { CalendarView, type CalendarMode } from "./CalendarView";
import type { ItemStatus } from "./ItemCard";

function readName(): string | null {
  try {
    return localStorage.getItem("ritim-name");
  } catch {
    return null;
  }
}

export function FeedbackCalendar({
  plan,
  brand,
  items,
  initialComments,
  initialAnnotations,
  stage,
  mode,
  authorRole,
  onStatusesChange,
}: {
  plan: Plan;
  brand: Brand;
  items: PlanItem[];
  initialComments: Comment[];
  initialAnnotations: Annotation[];
  stage: CommentStage;
  mode: CalendarMode;
  authorRole: Role;
  onStatusesChange?: (map: Record<string, ItemStatus>) => void;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [name, setName] = useState<string | null>(readName);
  const [askName, setAskName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const pending = useRef<((n: string) => void) | null>(null);

  const ensureName = (): Promise<string> => {
    if (name) return Promise.resolve(name);
    return new Promise((resolve) => {
      pending.current = resolve;
      setAskName(true);
    });
  };

  const submitName = () => {
    const value = nameDraft.trim() || "Marka";
    setName(value);
    try {
      localStorage.setItem("ritim-name", value);
    } catch {
      /* ignore */
    }
    setAskName(false);
    setNameDraft("");
    pending.current?.(value);
    pending.current = null;
  };

  const onComment = async (itemId: string, body: string) => {
    const author = await ensureName();
    const res = await fetch(`/api/plans/${plan.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, stage, authorName: author, authorRole, body, status: "none" }),
    });
    if (res.ok) {
      const created = (await res.json()) as Comment;
      setComments((c) => [...c, created]);
    }
  };

  const onAnnotate = async (
    itemId: string,
    mediaIndex: number,
    xPct: number,
    yPct: number,
    note: string,
  ) => {
    const author = await ensureName();
    const res = await fetch(`/api/plans/${plan.id}/annotations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, mediaIndex, xPct, yPct, note, stage, authorName: author }),
    });
    if (res.ok) {
      const created = (await res.json()) as Annotation;
      setAnnotations((a) => [...a, created]);
    }
  };

  const onDeleteAnnotation = async (annotationId: string) => {
    await fetch(`/api/plans/${plan.id}/annotations?annotationId=${annotationId}`, { method: "DELETE" });
    setAnnotations((a) => a.filter((x) => x.id !== annotationId));
  };

  const onStatus = (itemId: string, status: ItemStatus) => {
    onStatusesChange?.({ [itemId]: status });
  };

  return (
    <>
      <CalendarView
        plan={plan}
        brand={brand}
        items={items}
        mode={mode}
        comments={comments}
        annotations={annotations}
        onComment={onComment}
        onAnnotate={onAnnotate}
        onDeleteAnnotation={onDeleteAnnotation}
        onStatus={onStatus}
      />

      <Modal open={askName} onClose={() => setAskName(false)} labelledBy="name-modal-title">
        <h3 id="name-modal-title" className="font-[family-name:var(--font-display)] text-lg">
          Adınız
        </h3>
        <p className="mt-1 text-[13px] text-[var(--text-dim)]">Yorumunuzun yanında görünecek.</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitName();
          }}
        >
          <input
            aria-label="Adınız"
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
          />
          <button type="submit" className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)]">
            Devam
          </button>
        </form>
      </Modal>
    </>
  );
}
