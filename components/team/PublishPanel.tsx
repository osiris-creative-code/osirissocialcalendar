"use client";

import { useState } from "react";
import type { Plan, PlanItem } from "@/lib/types";
import { ITEM_TYPE_LABELS } from "@/lib/labels";
import { trDayMonth } from "@/lib/format";
import { publishStats } from "@/lib/publish";
import { PublishProgress } from "./PublishProgress";

export function PublishPanel({
  planId,
  items,
  color,
  onChanged,
}: {
  planId: string;
  items: PlanItem[];
  color?: string;
  onChanged: (data: { plan: Plan; items: PlanItem[] }) => void;
}) {
  // Own the list after mount so racing PATCH responses can't roll a checkbox back.
  const [local, setLocal] = useState(items);

  const real = local.filter((i) => !i.isGap && !i.hidden);
  const { published, total } = publishStats(local);

  const toggle = async (item: PlanItem) => {
    const next = item.publishedAt ? null : new Date().toISOString();
    setLocal((list) => list.map((i) => (i.id === item.id ? { ...i, publishedAt: next } : i)));
    const res = await fetch(`/api/plans/${planId}/publish`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: item.id, published: !item.publishedAt }),
    });
    if (res.ok) onChanged(await res.json());
  };

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
        Yayın takibi
      </h2>
      <PublishProgress published={published} total={total} color={color} />
      <ul className="mt-3 flex flex-col gap-1.5">
        {real.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]">
              <input
                type="checkbox"
                checked={!!item.publishedAt}
                onChange={() => toggle(item)}
              />
              <span className="font-mono text-[12px] text-[var(--text-mute)]">
                {trDayMonth(item.date)}
              </span>
              <span className="text-[var(--text-dim)]">{ITEM_TYPE_LABELS[item.type]}</span>
              {item.publishedAt && <span className="ml-auto text-[var(--ok)]">✓ yayında</span>}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
