"use client";

import { useRef, useState } from "react";
import type { Annotation, Brand, Comment, Plan, PlanItem, PlanTheme, Role } from "@/lib/types";
import { trRange } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/plan-stages";
import { PlanEditor } from "@/components/team/PlanEditor";
import { FeedbackInbox } from "@/components/team/FeedbackInbox";
import { InstagramReference } from "@/components/team/InstagramReference";
import { GapModal } from "@/components/team/GapModal";
import { StageBadge } from "@/components/team/StageBadge";
import { Toast } from "@/components/ui/Toast";

export function EditorClient({
  plan: initialPlan,
  brand,
  items: initialItems,
  comments,
  annotations,
  actorName,
  actorRole,
}: {
  plan: Plan;
  brand: Brand;
  items: PlanItem[];
  comments: Comment[];
  annotations: Annotation[];
  actorName: string;
  actorRole: Role;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [items, setItems] = useState(initialItems);
  const [gap, setGap] = useState<{ extendCount: number; stopCount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = async () => {
    setBusy(true);
    const res = await fetch(`/api/plans/${plan.id}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const preview = await res.json();
    setBusy(false);
    if (preview.gap) {
      setGap(preview.preview);
    } else {
      await applyGenerate("extend");
    }
  };

  const applyGenerate = async (mode: "extend" | "stopAtAssets") => {
    setBusy(true);
    const res = await fetch(`/api/plans/${plan.id}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    setBusy(false);
    setGap(null);
    if (data.items) setItems(data.items);
  };

  const persist = (nextItems?: PlanItem[], theme?: PlanTheme) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: nextItems, theme }),
      });
    }, 500);
  };

  const onEditorChange = (next: PlanItem[]) => {
    setItems(next);
    persist(next);
  };

  const sendToInternal = async () => {
    setBusy(true);
    const res = await fetch(`/api/plans/${plan.id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "ic_onayda", actorName, actorRole }),
    });
    const updated = (await res.json()) as Plan;
    setBusy(false);
    if (updated.stage) setPlan(updated);
  };

  const copy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      Toast.show("Kopyalandı");
    } catch {
      /* ignore */
    }
  };

  const internalUrl = `/i/${plan.internalToken}`;
  const publicUrl = plan.publicToken ? `/c/${plan.publicToken}` : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{plan.title}</h1>
            <p className="mt-1 font-mono text-[12.5px] text-[var(--text-mute)]">
              {brand.name} · {trRange(plan.rangeStart, plan.rangeEnd)}
            </p>
          </div>
          <StageBadge stage={plan.stage} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-[10px] bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)] disabled:opacity-60"
          >
            {items.length ? "Yeniden üret" : "Takvimi üret"}
          </button>

          {plan.stage === "taslak" && (
            <button
              type="button"
              onClick={sendToInternal}
              disabled={busy || items.length === 0}
              className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold text-[var(--text-dim)] disabled:opacity-60"
            >
              İç onaya gönder
            </button>
          )}
        </div>

        {plan.stage !== "taslak" && (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 text-[12.5px]">
            <span className="text-[var(--text-dim)]">Durum: {STAGE_LABELS[plan.stage]}</span>
            <span className="flex items-center gap-2">
              İç önizleme:
              <a data-testid="internal-link" href={internalUrl} className="font-mono underline">
                {internalUrl}
              </a>
              <button type="button" onClick={() => copy(internalUrl)} className="text-[var(--brand)]">
                Kopyala
              </button>
            </span>
            {publicUrl && (
              <span className="flex items-center gap-2">
                Marka linki:
                <a data-testid="public-link" href={publicUrl} className="font-mono underline">
                  {publicUrl}
                </a>
                <button type="button" onClick={() => copy(publicUrl)} className="text-[var(--brand)]">
                  Kopyala
                </button>
              </span>
            )}
          </div>
        )}

        <PlanEditor
          plan={plan}
          items={items}
          onChange={onEditorChange}
          onThemeChange={(theme) => {
            setPlan((p) => ({ ...p, theme }));
            persist(undefined, theme);
          }}
        />
      </div>

      <aside className="flex flex-col gap-4">
        <InstagramReference handle={brand.instagramHandle} />
        <FeedbackInbox comments={comments} annotations={annotations} items={items} />
      </aside>

      <GapModal
        open={gap !== null}
        preview={gap ?? { extendCount: 0, stopCount: 0 }}
        onPick={applyGenerate}
        onClose={() => setGap(null)}
      />
    </div>
  );
}
