"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import type { PlanItem } from "@/lib/types";
import { stagger, riseIn } from "@/lib/motion";

/** A number that rolls up to its value instead of snapping. */
function Counter({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const springed = useSpring(mv, { stiffness: 90, damping: 18 });
  const [shown, setShown] = useState(0);

  useEffect(() => mv.set(value), [value, mv]);
  useEffect(() => springed.on("change", (v) => setShown(Math.round(v))), [springed]);

  return <span className="tabular-nums">{shown}</span>;
}

/** Counts that tell you at a glance whether the calendar is balanced. */
const SUMMARY_STAGGER = stagger();

export function PlanSummary({
  items,
  rangeStart,
  rangeEnd,
}: {
  items: PlanItem[];
  rangeStart: string;
  rangeEnd: string;
}) {
  const stats = useMemo(() => {
    const visible = items.filter((i) => !i.hidden);
    const counts = { post: 0, story: 0, reel: 0, special: 0 };
    for (const i of visible) counts[i.type]++;

    const scheduled = new Set(visible.map((i) => i.date));
    const day = 86400000;
    const end = new Date(`${rangeEnd}T00:00:00Z`).getTime();
    let empty = 0;
    for (let t = new Date(`${rangeStart}T00:00:00Z`).getTime(); t <= end; t += day) {
      if (!scheduled.has(new Date(t).toISOString().slice(0, 10))) empty++;
    }
    return { ...counts, empty };
  }, [items, rangeStart, rangeEnd]);

  const cells: { label: string; value: number; tone?: "warn" }[] = [
    { label: "post", value: stats.post },
    { label: "story", value: stats.story },
    { label: "reels", value: stats.reel },
    { label: "güne özel", value: stats.special },
    { label: "boş gün", value: stats.empty, tone: stats.empty > 0 ? "warn" : undefined },
  ];

  return (
    <motion.dl
      variants={SUMMARY_STAGGER}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap gap-2"
    >
      {cells.map((cell) => (
        <motion.div
          key={cell.label}
          variants={riseIn}
          className={`flex min-w-[84px] flex-col rounded-[var(--r-md)] border px-3 py-2 ${
            cell.tone === "warn"
              ? "border-[color-mix(in_srgb,var(--warn)_45%,transparent)] bg-[var(--warn-soft)]"
              : "border-[var(--border)] bg-[var(--surface)]"
          }`}
        >
          <dd className="font-[family-name:var(--font-display)] text-[22px] font-semibold leading-none">
            <Counter value={cell.value} />
          </dd>
          <dt className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[var(--text-mute)]">
            {cell.label}
          </dt>
        </motion.div>
      ))}
    </motion.dl>
  );
}
