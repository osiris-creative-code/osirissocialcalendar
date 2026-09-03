"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DEFAULT_PROMPT =
  "01–12 Eylül arası: 2 günde bir post, her gün story, haftada 1 reels. 7 Eylül Dünya Çikolata Günü'ne özel post. Postlarda sıcak, samimi bir dil ve hafif emoji. Story'lere açıklama yazma.";

export function NewPlanForm({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("Eylül Takvimi");
  const [rangeStart, setRangeStart] = useState("2026-08-28");
  const [rangeEnd, setRangeEnd] = useState("2026-09-11");
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandId, title, rangeStart, rangeEnd, prompt, driveFolderUrl }),
    });
    setBusy(false);
    if (res.ok) {
      const plan = await res.json();
      router.push(`/app/plans/${plan.id}`);
    } else {
      setError("Plan oluşturulamadı.");
    }
  };

  return (
    <form className="mx-auto flex max-w-[560px] flex-col gap-4" onSubmit={submit}>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Yeni plan</h1>

      <label className="text-[13px] text-[var(--text-dim)]">
        Başlık
        <input
          aria-label="Başlık"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex-1 text-[13px] text-[var(--text-dim)]">
          Başlangıç
          <input
            aria-label="Başlangıç"
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
          />
        </label>
        <label className="flex-1 text-[13px] text-[var(--text-dim)]">
          Bitiş
          <input
            aria-label="Bitiş"
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
          />
        </label>
      </div>

      <label className="text-[13px] text-[var(--text-dim)]">
        Google Drive klasör linki (opsiyonel)
        <input
          aria-label="Drive klasör linki"
          value={driveFolderUrl}
          onChange={(e) => setDriveFolderUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/…"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
        />
        <span className="mt-1 block text-[11.5px] text-[var(--text-mute)]">
          Bu çekimin klasörü. İçindeki POST / STORY / REELS alt klasörlerinden içerik çekilir
          (CROP klasörleri atlanır). Klasör “bağlantısı olan herkes”e açık olmalı.
        </span>
      </label>

      <label className="text-[13px] text-[var(--text-dim)]">
        Plan promptu
        <textarea
          aria-label="Plan promptu"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-1 min-h-[132px] w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] p-3 text-[13px] leading-6"
        />
      </label>

      {error && <p className="text-[12.5px] text-[var(--accent)]">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-[10px] bg-[var(--brand)] px-5 py-2.5 text-[14px] font-semibold text-[var(--brand-ink)] disabled:opacity-60"
      >
        Oluştur
      </button>
    </form>
  );
}
