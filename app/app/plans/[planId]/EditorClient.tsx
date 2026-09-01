"use client";

import { useEffect, useRef, useState } from "react";
import type { Annotation, Brand, Comment, Plan, PlanAsset, PlanItem, PlanTheme, Role } from "@/lib/types";
import { trRange } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/plan-stages";
import { waLink } from "@/lib/whatsapp";
import { PlanEditor } from "@/components/team/PlanEditor";
import { ContentUploader } from "@/components/team/ContentUploader";
import { FeedbackInbox } from "@/components/team/FeedbackInbox";
import { InstagramPanel } from "@/components/team/InstagramPanel";
import { VersionHistory } from "@/components/team/VersionHistory";
import { GapModal } from "@/components/team/GapModal";
import { StageBadge } from "@/components/team/StageBadge";
import { PublishPanel } from "@/components/team/PublishPanel";
import { Toast } from "@/components/ui/Toast";

export function EditorClient({
  plan: initialPlan,
  brand,
  items: initialItems,
  assets,
  comments,
  annotations,
  actorName,
  actorRole,
  driveReady = false,
}: {
  plan: Plan;
  brand: Brand;
  items: PlanItem[];
  assets: PlanAsset[];
  comments: Comment[];
  annotations: Annotation[];
  actorName: string;
  actorRole: Role;
  driveReady?: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [items, setItems] = useState(initialItems);
  const [gap, setGap] = useState<{ extendCount: number; stopCount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = async () => {
    setBusy(true);
    setGenerating(true);
    const res = await fetch(`/api/plans/${plan.id}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const preview = await res.json();
    setBusy(false);
    if (preview.gap) {
      setGenerating(false);
      setGap(preview.preview);
    } else {
      await applyGenerate("extend");
    }
  };

  const applyGenerate = async (mode: "extend" | "stopAtAssets") => {
    setBusy(true);
    setGenerating(true);
    const res = await fetch(`/api/plans/${plan.id}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    setBusy(false);
    setGenerating(false);
    setGap(null);
    if (data.items) setItems(data.items);
  };

  const publishAction = async (action: "start" | "revert") => {
    setBusy(true);
    const res = await fetch(`/api/plans/${plan.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setPlan(data.plan);
      setItems(data.items);
    }
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

  const onRewrite = async (itemId: string, instruction: string) => {
    const res = await fetch(`/api/plans/${plan.id}/rewrite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, instruction }),
    });
    if (!res.ok) {
      Toast.show("Yeniden yazılamadı");
      return;
    }
    const updated = (await res.json()) as PlanItem;
    setItems((list) => list.map((it) => (it.id === itemId ? updated : it)));
  };

  const onVisionChange = (enabled: boolean) => {
    setPlan((p) => ({ ...p, visionEnabled: enabled }));
    fetch(`/api/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visionEnabled: enabled }),
    });
  };

  const onDeadlineChange = (value: string) => {
    setPlan((p) => ({ ...p, reviseDeadline: value || null }));
    fetch(`/api/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviseDeadline: value || null }),
    });
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
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const waBtn =
    "rounded border border-[var(--ok)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--ok)]";

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

        {plan.stage === "taslak" && (
          <ContentUploader planId={plan.id} initialAssets={assets} driveReady={driveReady} />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-[10px] bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)] disabled:opacity-60"
          >
            {generating ? "Üretiliyor…" : items.length ? "Yeniden üret" : "Takvimi üret"}
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

          {plan.stage === "onaylandi" && (
            <button
              type="button"
              onClick={() => publishAction("start")}
              disabled={busy}
              className="rounded-[10px] bg-[var(--ok)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              Yayına al
            </button>
          )}
          {(plan.stage === "yayinda" || plan.stage === "tamamlandi") && (
            <button
              type="button"
              onClick={() => publishAction("revert")}
              disabled={busy}
              className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold text-[var(--text-dim)] disabled:opacity-60"
            >
              Yayını geri al
            </button>
          )}
        </div>

        {(plan.stage === "yayinda" || plan.stage === "tamamlandi") && (
          <PublishPanel
            planId={plan.id}
            items={items}
            color={plan.theme.primary}
            onChanged={(d) => {
              setPlan(d.plan);
              setItems(d.items);
            }}
          />
        )}

        {generating && (
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="mb-2 flex items-center gap-2 text-[12.5px] text-[var(--text-dim)]">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
              Takvim üretiliyor — kurallar çözülüyor, görseller dağıtılıyor, açıklamalar yazılıyor…
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div className="h-full w-1/3 animate-[osiris-slide_1.2s_ease-in-out_infinite] rounded-full bg-[var(--brand)]" />
            </div>
          </div>
        )}

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
              <a
                className={waBtn}
                target="_blank"
                rel="noopener noreferrer"
                href={waLink({
                  text: `${brand.name} — iç önizleme hazır: ${origin}${internalUrl}`,
                })}
              >
                WhatsApp'tan ekibe
              </a>
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
                <a
                  className={waBtn}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={waLink({
                    phone: brand.phone,
                    text: `${brand.name} — sosyal medya paylaşım takvimi hazır, onayına sunuyoruz: ${origin}${publicUrl}`,
                  })}
                >
                  WhatsApp'tan markaya
                </a>
              </span>
            )}
            <label className="flex items-center gap-2 text-[var(--text-dim)]">
              Marka için revize son tarihi:
              <input
                type="date"
                value={plan.reviseDeadline ?? ""}
                onChange={(e) => onDeadlineChange(e.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[12px]"
              />
              {plan.reviseDeadline && (
                <button type="button" onClick={() => onDeadlineChange("")} className="text-[var(--text-mute)]">
                  temizle
                </button>
              )}
            </label>
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
          onRewrite={onRewrite}
          onVisionChange={onVisionChange}
        />
      </div>

      <aside className="flex flex-col gap-4">
        <InstagramPanel
          planId={plan.id}
          brandId={brand.id}
          handle={brand.instagramHandle}
          initialScreenshot={brand.feedScreenshotUrl}
          initialInsights={plan.feedInsights}
          initialThumbs={brand.feedThumbs}
        />
        <VersionHistory planId={plan.id} currentItems={items} />
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
