"use client";

import { useEffect, useState } from "react";
import type { ItemType, Plan, PlanItem, PlanTheme } from "@/lib/types";

const TYPE_LABEL: Record<ItemType, string> = {
  post: "POST",
  story: "STORY",
  reel: "REEL",
  special: "GÜNE ÖZEL",
};

export function PlanEditor({
  plan,
  items,
  onChange,
  onThemeChange,
  onRewrite,
  onVisionChange,
}: {
  plan: Plan;
  items: PlanItem[];
  onChange: (items: PlanItem[]) => void;
  onThemeChange?: (theme: PlanTheme) => void;
  onRewrite?: (itemId: string, instruction: string) => Promise<void> | void;
  onVisionChange?: (enabled: boolean) => void;
}) {
  const [rows, setRows] = useState<PlanItem[]>(items);
  const [theme, setTheme] = useState<PlanTheme>(plan.theme);
  const [steer, setSteer] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [vision, setVision] = useState(plan.visionEnabled);

  const rewrite = async (id: string) => {
    if (!onRewrite) return;
    setBusyId(id);
    await onRewrite(id, steer[id] ?? "");
    setBusyId(null);
  };

  useEffect(() => {
    setRows(items);
  }, [items]);

  const commit = (next: PlanItem[]) => {
    const resorted = next.map((r, i) => ({ ...r, sort: i }));
    setRows(resorted);
    onChange(resorted);
  };

  const move = (index: number, delta: number) => {
    const j = index + delta;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[index], next[j]] = [next[j], next[index]];
    commit(next);
  };

  const remove = (index: number) => commit(rows.filter((_, i) => i !== index));

  const setCaption = (index: number, caption: string) =>
    commit(rows.map((r, i) => (i === index ? { ...r, caption } : r)));

  const setDate = (index: number, date: string) =>
    commit(rows.map((r, i) => (i === index ? { ...r, date } : r)));

  const fillGap = (index: number) =>
    commit(
      rows.map((r, i) =>
        i === index
          ? {
              ...r,
              isGap: false,
              media: [{ url: "/demo/ph-3.svg", kind: "image" as const, slideOrder: 1 }],
              caption: r.type === "story" ? null : "Yeni görsel — açıklama ekleyin.",
            }
          : r,
      ),
    );

  const updateTheme = (patch: Partial<PlanTheme>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    onThemeChange?.(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <li
            key={row.id}
            className={`flex flex-col gap-2 rounded-[10px] border px-3 py-2.5 ${
              row.isGap
                ? "border-l-[3px] border-[color-mix(in_srgb,var(--gold)_45%,transparent)] border-l-[var(--warn)] bg-[var(--warn-soft)]"
                : "border-[var(--border)] bg-[var(--bg)]"
            }`}
          >
           <div className="grid grid-cols-[22px_58px_auto_1fr_auto] items-center gap-3">
            <span className="text-center text-[13px] text-[var(--text-mute)]">⠿</span>
            <span className="text-center font-mono text-[11px] leading-tight text-[var(--text-dim)]">
              {row.date.slice(5)}
              <br />
              {TYPE_LABEL[row.type]}
            </span>
            {row.media[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.media[0].url} alt="" className="h-10 w-8 rounded border border-[var(--border)] object-cover" />
            ) : (
              <span className="h-10 w-8 rounded border border-[var(--border)] bg-[var(--surface-2)]" />
            )}

            {row.isGap ? (
              <span className="flex items-center gap-2 text-[12.5px] text-[var(--warn)]">
                İçerik eksik
                <button
                  type="button"
                  onClick={() => fillGap(i)}
                  className="rounded-[7px] border border-[var(--warn)] px-2 py-1 text-[11.5px] font-semibold"
                >
                  Drive&apos;dan seç
                </button>
              </span>
            ) : row.type === "story" ? (
              <span className="text-[13px] text-[var(--text-mute)]">—</span>
            ) : (
              <textarea
                aria-label={`${TYPE_LABEL[row.type]} açıklaması`}
                value={row.caption ?? ""}
                onChange={(e) => setCaption(i, e.target.value)}
                rows={2}
                className="w-full resize-y rounded border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] focus:border-[var(--border)] focus:bg-[var(--surface)]"
              />
            )}

            <span className="flex items-center gap-1">
              <input
                aria-label="Tarih"
                type="date"
                value={row.date}
                onChange={(e) => setDate(i, e.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-[11px]"
              />
              <button type="button" aria-label="Yukarı" onClick={() => move(i, -1)} className="grid h-6 w-6 place-items-center rounded text-[var(--text-mute)] hover:bg-[var(--surface-2)]">
                ↑
              </button>
              <button type="button" aria-label="Aşağı" onClick={() => move(i, 1)} className="grid h-6 w-6 place-items-center rounded text-[var(--text-mute)] hover:bg-[var(--surface-2)]">
                ↓
              </button>
              <button type="button" aria-label="Kaldır" onClick={() => remove(i)} className="grid h-6 w-6 place-items-center rounded text-[var(--text-mute)] hover:bg-[var(--surface-2)]">
                ×
              </button>
            </span>
           </div>

           {onRewrite && !row.isGap && row.type !== "story" && (
             <div className="flex items-center gap-2 pl-[80px]">
               <input
                 aria-label="Yeniden yaz yönergesi"
                 value={steer[row.id] ?? ""}
                 onChange={(e) => setSteer((s) => ({ ...s, [row.id]: e.target.value }))}
                 placeholder="yönerge (ops.): kısalt, daha eğlenceli…"
                 className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11.5px]"
               />
               <button
                 type="button"
                 onClick={() => rewrite(row.id)}
                 disabled={busyId === row.id}
                 className="whitespace-nowrap rounded-[7px] border border-[var(--border-strong)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-60"
               >
                 {busyId === row.id ? "…" : "↻ Yeniden yaz"}
               </button>
             </div>
           )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-[10px] border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[13px] text-[var(--text-mute)]">
            Henüz öğe yok. “Takvimi üret”e bas.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">Tema</span>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-dim)]">
          Ana renk
          <input
            aria-label="Ana renk"
            type="color"
            value={theme.primary}
            onChange={(e) => updateTheme({ primary: e.target.value })}
            className="h-8 w-10 rounded border border-[var(--border-strong)]"
          />
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-dim)]">
          Vurgu
          <input
            aria-label="Vurgu"
            type="color"
            value={theme.accent}
            onChange={(e) => updateTheme({ accent: e.target.value })}
            className="h-8 w-10 rounded border border-[var(--border-strong)]"
          />
        </label>
        <span
          data-testid="theme-preview"
          className="ml-auto rounded-[9px] px-3 py-1.5 font-[family-name:var(--font-display)] text-[13px] font-semibold text-white"
          style={{ background: theme.primary, border: `2px solid ${theme.accent}` }}
        >
          Önizleme
        </span>
      </div>

      {onVisionChange && (
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-dim)]">
          <input
            type="checkbox"
            checked={vision}
            onChange={(e) => {
              setVision(e.target.checked);
              onVisionChange(e.target.checked);
            }}
          />
          Görselleri AI&apos;ya göster — daha isabetli caption, biraz daha maliyet
        </label>
      )}
    </div>
  );
}
