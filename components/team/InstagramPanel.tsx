"use client";

import { useRef, useState } from "react";

export function InstagramPanel({
  planId,
  brandId,
  handle,
  initialScreenshot,
  initialInsights,
}: {
  planId: string;
  brandId: string;
  handle: string | null;
  initialScreenshot: string | null;
  initialInsights: string[] | null;
}) {
  const [screenshot, setScreenshot] = useState<string | null>(initialScreenshot);
  const [insights, setInsights] = useState<string[] | null>(initialInsights);
  const [busy, setBusy] = useState<"upload" | "analyze" | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadScreenshot = async (file: File | undefined) => {
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const up = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await up.json().catch(() => ({}));
      if (!up.ok || !data.url) {
        setError(data.error || "Yükleme başarısız.");
        return;
      }
      await fetch(`/api/brands/${brandId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ feedScreenshotUrl: data.url }),
      });
      setScreenshot(data.url as string);
    } finally {
      setBusy(null);
    }
  };

  const analyze = async () => {
    setBusy("analyze");
    setError("");
    try {
      const res = await fetch(`/api/plans/${planId}/analyze-feed`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setInsights(data.insights);
      else setError(data.error || "Analiz başarısız.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
          Mevcut feed {handle ? `· @${handle}` : ""}
        </h2>
        {screenshot && (
          <button
            type="button"
            onClick={analyze}
            disabled={!!busy}
            className="rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-60"
          >
            {busy === "analyze" ? "Analiz ediliyor…" : insights ? "Yeniden analiz et" : "Analiz et"}
          </button>
        )}
      </div>

      {screenshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshot}
          alt="Feed ekran görüntüsü"
          className="w-full rounded-[var(--r-md)] border border-[var(--border)]"
        />
      ) : (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-4 text-center text-[12px] text-[var(--text-mute)]">
          Markanın güncel Instagram feed&apos;inin ekran görüntüsünü yükle → AI analiz etsin,
          çıkan notlar sonraki üretimde caption&apos;lara katılır.
        </div>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={!!busy}
        className="mt-2 rounded-md border border-[var(--border)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--text-dim)] disabled:opacity-60"
      >
        {busy === "upload" ? "Yükleniyor…" : screenshot ? "Ekran görüntüsünü değiştir" : "Ekran görüntüsü yükle"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => uploadScreenshot(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-[11.5px] text-[var(--accent)]">{error}</p>}

      {insights && insights.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
          {insights.map((it, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-[var(--text-dim)]">
              <span className="text-[var(--gold)]">•</span>
              {it}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
