"use client";

import { useState } from "react";

type Result = { plansScanned: number; plansFixed: number; assetsFixed: number; itemsFixed: number };

/**
 * One-time cleanup for plans imported before reels moved off Drive's own
 * /preview iframe. Safe to click more than once — a second run always
 * reports 0 fixed once everything's on the new url shape.
 */
export function MigrateDriveVideos() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | { error: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/dev/migrate-drive-videos", { method: "POST" });
      setResult(await res.json());
    } catch (e) {
      setResult({ error: `istek hatası: ${(e as Error).message}` });
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
        {busy ? "Taranıyor…" : "Eski Drive reels linklerini düzelt"}
      </button>
      {result && (
        <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-[11.5px] leading-5">
          {"error" in result ? (
            <div className="text-[var(--accent)]">✗ {result.error}</div>
          ) : (
            <>
              <div className="text-[var(--ok)]">
                {result.plansFixed === 0 ? "Düzeltilecek bir şey kalmamış." : `✓ ${result.plansFixed} plan düzeltildi`}
              </div>
              <div className="text-[var(--text-dim)]">
                {result.plansScanned} plan tarandı · {result.assetsFixed} içerik, {result.itemsFixed} takvim öğesi
                düzeltildi
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
