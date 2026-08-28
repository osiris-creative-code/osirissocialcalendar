"use client";

import { useState } from "react";

export function InstagramPanel({
  planId,
  handle,
  initialInsights,
}: {
  planId: string;
  handle: string | null;
  initialInsights: string[] | null;
}) {
  const [insights, setInsights] = useState<string[] | null>(initialInsights);
  const [busy, setBusy] = useState(false);
  const cells = Array.from({ length: 9 }, (_, i) => `/demo/ph-${(i % 5) + 1}.svg`);

  const analyze = async () => {
    setBusy(true);
    const res = await fetch(`/api/plans/${planId}/analyze-feed`, { method: "POST" });
    setBusy(false);
    if (res.ok) setInsights((await res.json()).insights);
  };

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
          Mevcut Instagram feed&apos;i
        </h2>
        <button
          type="button"
          onClick={analyze}
          disabled={busy}
          className="rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-60"
        >
          {busy ? "Analiz ediliyor…" : insights ? "Yeniden analiz et" : "Feed'i analiz et"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {cells.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="aspect-square w-full rounded-[3px] object-cover" />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-mute)]">
        {handle ? `@${handle}` : "Instagram bağlı değil"} — örnek feed (Phase 2&apos;de canlı)
      </p>

      {insights && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
          {insights.map((it, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-[var(--text-dim)]">
              <span className="text-[var(--gold)]">•</span>
              {it}
            </li>
          ))}
          <li className="mt-1 text-[11px] text-[var(--text-mute)]">
            Bu notlar bir sonraki “Takvimi üret”de caption'lara katılır.
          </li>
        </ul>
      )}
    </section>
  );
}
