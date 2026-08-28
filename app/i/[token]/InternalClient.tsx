"use client";

import { useState } from "react";
import type { Annotation, Brand, Comment, Plan, PlanItem } from "@/lib/types";
import { FeedbackCalendar } from "@/components/calendar/FeedbackCalendar";

export function InternalClient({
  plan,
  brand,
  items,
  comments,
  annotations,
  title = "",
}: {
  plan: Plan;
  brand: Brand;
  items: PlanItem[];
  comments: Comment[];
  annotations: Annotation[];
  title?: string;
}) {
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [brandLink, setBrandLink] = useState<string | null>(null);
  const [sentBack, setSentBack] = useState(false);
  const [busy, setBusy] = useState(false);

  const who = reviewer.trim() || "İç onay";

  const approve = async () => {
    setBusy(true);
    await fetch(`/api/plans/${plan.id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "markaya_hazir", actorName: who, actorRole: "onaylayan" }),
    });
    const res = await fetch(`/api/plans/${plan.id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "markada", actorName: who, actorRole: "onaylayan" }),
    });
    const updated = (await res.json()) as Plan;
    setBusy(false);
    if (updated.publicToken) setBrandLink(`/c/${updated.publicToken}`);
  };

  const sendBack = async () => {
    if (!note.trim()) {
      setNoteError(true);
      return;
    }
    setBusy(true);
    if (items[0]) {
      await fetch(`/api/plans/${plan.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: items[0].id,
          stage: "internal",
          authorName: who,
          authorRole: "onaylayan",
          body: note.trim(),
          status: "changes",
        }),
      });
    }
    await fetch(`/api/plans/${plan.id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "taslak", actorName: who, actorRole: "onaylayan" }),
    });
    setBusy(false);
    setSentBack(true);
  };

  return (
    <main className="min-h-screen pb-28">
      <div className="bg-[var(--warn-soft)] px-5 py-2.5 text-center text-[12.5px] font-semibold uppercase tracking-wide text-[var(--warn)]">
        İÇ ONAY — markaya gönderilmedi
      </div>

      <header className="mx-auto max-w-[760px] px-5 py-5">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{brand.name}</h1>
        <p className="mt-1 font-mono text-[12.5px] text-[var(--text-dim)]">{title}</p>
      </header>

      <div className="mx-auto max-w-[760px] px-5">
        <FeedbackCalendar
          plan={plan}
          brand={brand}
          items={items.filter((i) => !i.hidden && !i.isGap)}
          initialComments={comments}
          initialAnnotations={annotations}
          stage="internal"
          mode="internal"
          authorRole="onaylayan"
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--surface)]/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[760px] flex-col gap-2">
          {brandLink ? (
            <p className="text-[13px] text-[var(--ok)]">
              Onaylandı. Marka linki:{" "}
              <a data-testid="brand-link" href={brandLink} className="font-mono underline">
                {brandLink}
              </a>
            </p>
          ) : sentBack ? (
            <p className="text-[13px] text-[var(--text-dim)]">Plan yöneticiye geri gönderildi.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Adınız"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder="Adınız"
                className="w-32 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
              />
              <input
                aria-label="Geri gönderme notu"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteError(false);
                }}
                placeholder="Geri gönderme notu"
                className={`min-w-[180px] flex-1 rounded-lg border bg-[var(--bg)] px-3 py-2 text-[13px] ${
                  noteError ? "border-[var(--accent)]" : "border-[var(--border)]"
                }`}
              />
              <button
                type="button"
                onClick={sendBack}
                disabled={busy}
                className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold text-[var(--text-dim)] disabled:opacity-60"
              >
                Yöneticiye geri gönder
              </button>
              <button
                type="button"
                onClick={approve}
                disabled={busy}
                className="rounded-[10px] bg-[var(--brand)] px-5 py-2 text-[13px] font-semibold text-[var(--brand-ink)] disabled:opacity-60"
              >
                Onayla
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
