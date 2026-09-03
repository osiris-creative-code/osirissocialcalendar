"use client";

import { useState } from "react";

export function StorageCheck() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; steps: string[] } | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/dev/storage-check");
      setResult(await res.json());
    } catch (e) {
      setResult({ ok: false, steps: [`istek hatası: ${(e as Error).message}`] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-dim)] disabled:opacity-60"
      >
        {busy ? "Kontrol ediliyor…" : "Depo (Storage) testi çalıştır"}
      </button>
      {result && (
        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-[11.5px] leading-5">
          <div className={result.ok ? "text-[var(--ok)]" : "text-[var(--accent)]"}>
            {result.ok ? "✓ Storage çalışıyor" : "✗ Storage sorunlu"}
          </div>
          {result.steps.map((s, i) => (
            <div key={i} className="text-[var(--text-dim)]">
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
