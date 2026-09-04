"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Plan, Role } from "@/lib/types";
import { trRange } from "@/lib/format";
import { StageBadge } from "./StageBadge";
import { PublishProgress } from "./PublishProgress";

export function QueueRow({
  plan,
  brandName,
  actor,
  stats,
  feedbackCount,
}: {
  plan: Plan;
  brandName: string;
  actor: { name: string; role: Role };
  stats?: { published: number; total: number };
  /** Comments + pin annotations waiting on this plan (revize_istendi only). */
  feedbackCount?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const overdue =
    plan.reviseDeadline != null &&
    plan.stage === "markada" &&
    plan.reviseDeadline < new Date().toISOString().slice(0, 10);

  const approve = async () => {
    setBusy(true);
    await fetch(`/api/plans/${plan.id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "onaylandi", actorName: actor.name, actorRole: actor.role }),
    });
    setBusy(false);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm(`"${plan.title}" planı silinsin mi? Bu geri alınamaz.`)) return;
    setBusy(true);
    await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => router.push(`/app/plans/${plan.id}`)}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <span className="font-medium">{brandName}</span>
        <span className="truncate text-[var(--text-dim)]">{plan.title}</span>
        <span className="hidden font-mono text-[12px] text-[var(--text-mute)] sm:inline">
          {trRange(plan.rangeStart, plan.rangeEnd)}
        </span>
        {overdue && (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
            ⏰ süre doldu
          </span>
        )}
        {!!feedbackCount && (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
            💬 {feedbackCount} not
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <StageBadge stage={plan.stage} />
        {plan.stage === "markada" && (
          <button
            type="button"
            onClick={approve}
            disabled={busy}
            className="rounded-md bg-[var(--ok-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ok)] disabled:opacity-60"
          >
            ✓ Onayla
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label="Sil"
          className="rounded-md border border-[var(--border-strong)] px-2 py-1 text-[12px] font-semibold text-[var(--text-mute)] hover:text-[var(--accent)] disabled:opacity-60"
        >
          Sil
        </button>
      </div>
    </div>
    {stats && (plan.stage === "yayinda" || plan.stage === "tamamlandi") && (
      <div className="mt-2">
        <PublishProgress published={stats.published} total={stats.total} />
      </div>
    )}
    </div>
  );
}
