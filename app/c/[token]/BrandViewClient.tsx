"use client";

import { useMemo, useState } from "react";
import type { Annotation, Comment, Plan, PlanItem, PlanVersion, Brand } from "@/lib/types";
import { deadlineLabel } from "@/lib/format";
import { diffPlanItems } from "@/lib/diff";
import { Splash } from "@/components/Splash";
import { DiffList } from "@/components/DiffList";
import { FeedbackCalendar } from "@/components/calendar/FeedbackCalendar";
import type { ItemStatus } from "@/components/calendar/ItemCard";

const CONFIRM_TEXT =
  "Revizeleriniz ekibe iletildi. En kısa sürede görülmesi için lütfen WhatsApp grubundan kısa bir not bırakın.";

export function BrandViewClient({
  plan,
  brand,
  items,
  comments,
  annotations,
  splashTitle,
  publishedVersions = [],
}: {
  plan: Plan;
  brand: Brand;
  items: PlanItem[];
  comments: Comment[];
  annotations: Annotation[];
  splashTitle: string;
  publishedVersions?: PlanVersion[];
}) {
  const [showSplash, setShowSplash] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  const deadline = plan.reviseDeadline ? deadlineLabel(plan.reviseDeadline) : null;
  const changes =
    publishedVersions.length >= 2
      ? diffPlanItems(publishedVersions[1].items, publishedVersions[0].items)
      : [];

  const visible = useMemo(
    () => items.filter((i) => !i.hidden && !i.isGap),
    [items],
  );
  const updated = plan.version > 1 && (plan.stage === "markada" || plan.stage === "revize_istendi");

  const submit = async () => {
    setSending(true);
    const allApproved =
      visible.length > 0 && visible.every((i) => statuses[i.id] === "approved");
    let name = "Marka";
    try {
      name = localStorage.getItem("ritim-name") || "Marka";
    } catch {
      /* ignore */
    }
    await fetch(`/api/plans/${plan.id}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ round: allApproved ? "onay" : "revize", authorName: name }),
    });
    setSending(false);
    setSubmitted(true);
  };

  if (showSplash) {
    return (
      <Splash
        brandName={brand.name}
        logoUrl={brand.logoUrl}
        colorPrimary={brand.colorPrimary}
        title={splashTitle}
        storageKey={`ritim-splash-${plan.publicToken}`}
        onDone={() => setShowSplash(false)}
      />
    );
  }

  if (submitted) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <div
            className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full text-2xl"
            style={{ background: brand.colorPrimary, color: "#fff" }}
          >
            ✓
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Teşekkürler</h1>
          <p className="mx-auto mt-2 max-w-sm text-[14px] text-[var(--text-dim)]">{CONFIRM_TEXT}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen pb-24"
      style={{
        ["--brand" as string]: brand.colorPrimary,
        ["--accent" as string]: brand.colorAccent,
      }}
    >
      <header
        className="px-5 py-6"
        style={{
          background: `linear-gradient(120% 140% at 100% 0%, ${brand.colorPrimary}22 0%, transparent 60%)`,
        }}
      >
        <div className="mx-auto flex max-w-[760px] items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="h-14 w-14 rounded-2xl object-cover"
            style={{ background: brand.colorPrimary }}
          />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{brand.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12.5px] text-[var(--text-dim)]">{splashTitle}</span>
              {updated && (
                <span
                  className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{ background: brand.colorAccent, color: "#241e1a" }}
                >
                  Güncellendi
                </span>
              )}
              {deadline && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                    deadline.overdue
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--surface-2)] text-[var(--text-dim)]"
                  }`}
                >
                  ⏰ {deadline.text}
                </span>
              )}
              {changes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowChanges((s) => !s)}
                  className="rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)]"
                >
                  {showChanges ? "Değişiklikleri gizle" : `Neler değişti? (${changes.length})`}
                </button>
              )}
            </div>
          </div>
        </div>

        {showChanges && changes.length > 0 && (
          <div className="mx-auto mt-3 max-w-[760px] rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
              Son revizyonda değişenler
            </p>
            <DiffList diff={changes} />
          </div>
        )}
      </header>

      <div className="mx-auto max-w-[760px] px-5 pt-4">
        <FeedbackCalendar
          plan={plan}
          brand={brand}
          items={visible}
          initialComments={comments}
          initialAnnotations={annotations}
          stage="brand"
          mode="brand"
          authorRole="marka"
          onStatusesChange={(partial) => setStatuses((s) => ({ ...s, ...partial }))}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--surface)]/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3">
          <span className="text-[12px] text-[var(--text-mute)]">
            Yorumlarınız anlık kaydedilir. Bitirince gönderin.
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="rounded-[10px] px-5 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
            style={{ background: brand.colorPrimary }}
          >
            Revizeleri gönder
          </button>
        </div>
      </div>
    </main>
  );
}
