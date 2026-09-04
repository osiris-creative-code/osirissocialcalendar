"use client";

import { useState } from "react";
import { Toast } from "@/components/ui/Toast";

type Suggestion = {
  candidateId: string;
  kind: "carousel" | "spread";
  assetIds: string[];
  names: string[];
  reason: string;
};

/**
 * "Bu kareler birbirine benziyor" önerileri. Nothing is applied automatically —
 * the team accepts or dismisses each one.
 */
export function ShootAnalysis({ planId, onAssetsChanged }: { planId: string; onAssetsChanged?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  const [note, setNote] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [applying, setApplying] = useState<string | null>(null);

  const analyze = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/plans/${planId}/analyze-assets`, { method: "POST" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        Toast.show(data.error || `Analiz edilemedi (${res.status})`);
        return;
      }
      setSuggestions(data.suggestions ?? []);
      setNote(data.note ?? "");
      setRan(true);
    } catch (e) {
      Toast.show(`Analiz edilemedi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const merge = async (s: Suggestion) => {
    setApplying(s.candidateId);
    try {
      const res = await fetch(`/api/plans/${planId}/merge-carousel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetIds: s.assetIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Toast.show(data.error || "Birleştirilemedi");
        return;
      }
      dismiss(s.candidateId);
      Toast.show("Kaydırmalı gönderi olarak birleştirildi");
      onAssetsChanged?.();
    } catch (e) {
      Toast.show(`Birleştirilemedi: ${(e as Error).message}`);
    } finally {
      setApplying(null);
    }
  };

  const dismiss = (candidateId: string) =>
    setSuggestions((list) => list.filter((s) => s.candidateId !== candidateId));

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
          İçerik analizi
        </h2>
        <button
          type="button"
          onClick={analyze}
          disabled={busy}
          className="rounded-md border border-[var(--brand)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-50"
        >
          {busy ? "Bakılıyor…" : "İçeriği analiz et"}
        </button>
      </div>

      <p className="mt-1.5 text-[12px] text-[var(--text-mute)]">
        Benzeyen kareleri bulur: aynı çekimden olanları kaydırmalı gönderiye çevirmeyi, benzer
        story&apos;leri takvimde birbirinden uzaklaştırmayı önerir.
      </p>

      {ran && suggestions.length === 0 && note && (
        <p className="mt-2 text-[12.5px] text-[var(--text-dim)]">{note}</p>
      )}

      {suggestions.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {suggestions.map((s) => (
            <li
              key={s.candidateId}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[12.5px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="rounded bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--brand)]">
                    {s.kind === "carousel" ? "kaydırmalı öneri" : "araya mesafe koy"}
                  </span>
                  <p className="mt-1.5 text-[var(--text-dim)]">{s.reason}</p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--text-mute)]">
                    {s.names.join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {s.kind === "carousel" && (
                    <button
                      type="button"
                      onClick={() => merge(s)}
                      disabled={applying === s.candidateId}
                      className="rounded-md bg-[var(--brand)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand-ink)] disabled:opacity-60"
                    >
                      {applying === s.candidateId ? "…" : "Birleştir"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismiss(s.candidateId)}
                    className="rounded-md px-2.5 py-1 text-[11.5px] text-[var(--text-mute)]"
                  >
                    Yoksay
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
