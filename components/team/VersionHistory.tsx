"use client";

import { useEffect, useState } from "react";
import type { PlanItem, PlanVersion } from "@/lib/types";
import { diffPlanItems } from "@/lib/diff";
import { DiffList } from "@/components/DiffList";

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function VersionHistory({
  planId,
  currentItems,
}: {
  planId: string;
  currentItems: PlanItem[];
}) {
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const res = await fetch(`/api/plans/${planId}/versions`);
    if (res.ok) setVersions(await res.json());
  };
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const save = async () => {
    setBusy(true);
    await fetch(`/api/plans/${planId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    await refresh();
    setBusy(false);
  };

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
          Sürüm geçmişi
        </h2>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-60"
        >
          Sürümü kaydet
        </button>
      </div>

      {versions.length === 0 && (
        <p className="text-[12.5px] text-[var(--text-mute)]">Henüz kayıtlı sürüm yok.</p>
      )}

      <ul className="flex flex-col gap-2">
        {versions.map((v) => (
          <li key={v.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-2.5">
            <button
              type="button"
              onClick={() => setOpenId(openId === v.id ? null : v.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-[12.5px]">
                <b>v{v.version}</b> · {v.label}
              </span>
              <span className="font-mono text-[10.5px] text-[var(--text-mute)]">
                {timeLabel(v.createdAt)} · {v.actorName}
              </span>
            </button>
            {openId === v.id && (
              <div className="mt-2 border-t border-[var(--border)] pt-2">
                <p className="mb-1.5 text-[11px] text-[var(--text-mute)]">
                  Bu sürüm → şu anki taslak farkı:
                </p>
                <DiffList diff={diffPlanItems(v.items, currentItems)} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
