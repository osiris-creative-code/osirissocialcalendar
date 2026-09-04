"use client";

import { useState } from "react";
import { Toast } from "@/components/ui/Toast";
import type { ReviewNote } from "@/lib/ai/types";

const KIND_LABEL: Record<ReviewNote["kind"], string> = {
  "similar-too-close": "benzer içerik yakın",
  balance: "denge",
  "caption-repeat": "caption tekrarı",
  "special-day": "özel gün",
};

/**
 * The look-over before the plan goes to internal approval: what's crowded,
 * what repeats, which special day has nothing on it.
 */
export function CalendarReview({ planId }: { planId: string }) {
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  const [notes, setNotes] = useState<ReviewNote[]>([]);

  const review = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/plans/${planId}/review`, { method: "POST" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        Toast.show(data.error || `Tavsiye alınamadı (${res.status})`);
        return;
      }
      setNotes(data.notes ?? []);
      setRan(true);
    } catch (e) {
      Toast.show(`Tavsiye alınamadı: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass rounded-[var(--r-lg)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
          Takvim kontrolü
        </h2>
        <button
          type="button"
          onClick={review}
          disabled={busy}
          className="rounded-md border border-[var(--brand)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-50"
        >
          {busy ? "Bakılıyor…" : "Takvimi kontrol et"}
        </button>
      </div>

      <p className="mt-1.5 text-[12px] text-[var(--text-mute)]">
        İç onaya göndermeden önce: boş günler, içerik dengesi, tekrar eden caption&apos;lar ve
        kaçırılmış özel günler.
      </p>

      {ran && notes.length === 0 && (
        <p className="mt-2 text-[12.5px] text-[var(--ok)]">Takvim iyi görünüyor — not çıkmadı.</p>
      )}

      {notes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {notes.map((n, i) => (
            <li
              key={`${n.kind}-${i}`}
              className={`rounded-lg border px-3 py-2 text-[12.5px] ${
                n.severity === "warn"
                  ? "border-[color-mix(in_srgb,var(--warn)_45%,transparent)] bg-[var(--warn-soft)] text-[var(--text)]"
                  : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-dim)]"
              }`}
            >
              <span className="mr-1.5 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--text-mute)]">
                {KIND_LABEL[n.kind] ?? n.kind}
              </span>
              {n.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
