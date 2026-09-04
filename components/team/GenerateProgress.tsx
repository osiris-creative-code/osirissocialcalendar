"use client";

import { useEffect, useState } from "react";

/** A determinate, calibrated progress bar (% + ETA) for the one-shot AI generate call. */
export function GenerateProgress({ estimatedMs }: { estimatedMs: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - start), 150);
    return () => clearInterval(id);
  }, [estimatedMs]);

  const pct = Math.max(4, Math.min(96, Math.round((elapsed / Math.max(1, estimatedMs)) * 100)));
  const remainingMs = estimatedMs - elapsed;
  const etaText = remainingMs > 800 ? `~${Math.ceil(remainingMs / 1000)} sn kaldı` : "neredeyse bitti…";

  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12.5px] text-[var(--text-dim)]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
          Takvim üretiliyor — kurallar çözülüyor, görseller dağıtılıyor, açıklamalar yazılıyor…
        </span>
        <span className="font-mono text-[var(--text-mute)]">{`%${pct} · ${etaText}`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-150 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
