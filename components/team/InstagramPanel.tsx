"use client";

import { useRef, useState } from "react";

export function InstagramPanel({
  planId,
  brandId,
  handle,
  initialScreenshot,
  initialInsights,
  initialThumbs,
}: {
  planId: string;
  brandId: string;
  handle: string | null;
  initialScreenshot: string | null;
  initialInsights: string[] | null;
  initialThumbs?: string[] | null;
}) {
  const [screenshot, setScreenshot] = useState<string | null>(initialScreenshot);
  const [thumbs, setThumbs] = useState<string[] | null>(initialThumbs ?? null);
  const [insights, setInsights] = useState<string[] | null>(initialInsights);
  const [busy, setBusy] = useState<"upload" | "analyze" | "fetch" | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cleanHandle = handle?.replace(/^@/, "") ?? null;
  const hasSource = !!screenshot || (thumbs != null && thumbs.length > 0);

  const autoFetch = async () => {
    setBusy("fetch");
    setError("");
    setNote("");
    try {
      const res = await fetch(`/api/brands/${brandId}/fetch-feed`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.ok && Array.isArray(data.thumbs)) {
        setThumbs(data.thumbs);
        setNote(`${data.thumbs.length} kare alındı`);
      } else if (data.reason === "cache") {
        if (Array.isArray(data.thumbs) && data.thumbs.length) setThumbs(data.thumbs);
        setNote("Kısa süre önce çekildi.");
      } else {
        setNote("Otomatik alınamadı — aşağıdan ekran görüntüsü yükleyebilirsin.");
      }
    } finally {
      setBusy(null);
    }
  };

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
          Mevcut feed {cleanHandle ? `· @${cleanHandle}` : ""}
        </h2>
        {hasSource && (
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

      {cleanHandle && (
        <div className="mb-2 flex flex-wrap gap-2">
          <a
            href={`https://instagram.com/${cleanHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--text-dim)]"
          >
            Instagram&apos;ı Aç
          </a>
          <button
            type="button"
            onClick={autoFetch}
            disabled={!!busy}
            className="rounded-md border border-[var(--brand)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-60"
          >
            {busy === "fetch" ? "Çekiliyor…" : "Feed'i otomatik çek"}
          </button>
        </div>
      )}
      {note && <p className="mb-2 text-[11.5px] text-[var(--text-mute)]">{note}</p>}

      {thumbs && thumbs.length > 0 ? (
        <div className="grid grid-cols-3 gap-1">
          {thumbs.slice(0, 9).map((t, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={t} alt="" className="aspect-square w-full rounded object-cover" />
          ))}
        </div>
      ) : screenshot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshot}
          alt="Feed ekran görüntüsü"
          className="w-full rounded-[var(--r-md)] border border-[var(--border)]"
        />
      ) : (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-4 text-center text-[12px] text-[var(--text-mute)]">
          &ldquo;Feed&apos;i otomatik çek&rdquo;i dene ya da güncel feed&apos;in ekran görüntüsünü yükle →
          AI analiz etsin, çıkan notlar sonraki üretimde caption&apos;lara katılır.
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
