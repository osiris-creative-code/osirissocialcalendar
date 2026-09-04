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
import { GenerateProgress } from "@/components/team/GenerateProgress";
import { ShootAnalysis } from "@/components/team/ShootAnalysis";
import { CalendarReview } from "@/components/team/CalendarReview";
import { estimateGenerateMs } from "@/lib/generate-eta";
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
  driveEnabled = false,
}: {
  plan: Plan;
  brand: Brand;
  items: PlanItem[];
  assets: PlanAsset[];
  comments: Comment[];
  annotations: Annotation[];
  actorName: string;
  actorRole: Role;
  driveEnabled?: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [items, setItems] = useState(initialItems);
  const [gap, setGap] = useState<{ extendCount: number; stopCount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genItemCount, setGenItemCount] = useState(0);
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);
  const [openPinsFor, setOpenPinsFor] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const jumpToItem = (itemId: string, opts?: { pin?: boolean }) => {
    setHighlightItemId(itemId);
    document.getElementById(`plan-item-${itemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (opts?.pin) setOpenPinsFor(itemId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightItemId(null), 2500);
  };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState(initialPlan.title);
  const [rangeStart, setRangeStart] = useState(initialPlan.rangeStart);
  const [rangeEnd, setRangeEnd] = useState(initialPlan.rangeEnd);
  const [prompt, setPrompt] = useState(initialPlan.prompt);
  const [suggestion, setSuggestion] = useState<{ prompt: string; note: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const patchMeta = async (fields: Partial<Plan>) => {
    setPlan((p) => ({ ...p, ...fields }));
    await fetch(`/api/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fields),
    });
  };
  const saveMeta = () => patchMeta({ title, rangeStart, rangeEnd, prompt });

  const suggest = async () => {
    setSuggesting(true);
    setSuggestion(null);
    try {
      await saveMeta();
      const res = await fetch(`/api/plans/${plan.id}/suggest`, { method: "POST" });
      const text = await res.text();
      let data: { prompt?: string; note?: string; error?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        Toast.show(`Öneri alınamadı (${res.status}): ${text.slice(0, 120)}`);
        return;
      }
      if (res.ok && data.prompt) setSuggestion({ prompt: data.prompt, note: data.note ?? "" });
      else Toast.show(data.error || `Öneri alınamadı (${res.status})`);
    } catch (e) {
      Toast.show(`Öneri alınamadı: ${(e as Error).message}`);
    } finally {
      setSuggesting(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setPrompt(suggestion.prompt);
    patchMeta({ prompt: suggestion.prompt });
    setSuggestion(null);
  };

  const generate = async () => {
    setBusy(true);
    setGenerating(true);
    try {
      await saveMeta();
      const res = await fetch(`/api/plans/${plan.id}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const text = await res.text();
      const preview = text ? JSON.parse(text) : {};
      if (!res.ok) {
        Toast.show(preview.error || `Üretim başlatılamadı (${res.status})`);
        return;
      }
      if (preview.gap) {
        setGap(preview.preview);
        return; // gap modal takes over; applyGenerate keeps `generating` on
      }
      await applyGenerate("extend", preview.preview.extendCount);
      return; // applyGenerate owns busy/generating from here
    } catch (e) {
      Toast.show(`Üretim başlatılamadı: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setGenerating(false);
    }
  };

  const applyGenerate = async (mode: "extend" | "stopAtAssets", itemCount: number) => {
    setBusy(true);
    setGenItemCount(itemCount);
    setGenerating(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        Toast.show(data.error || `Üretilemedi (${res.status}). Tekrar dene.`);
        return;
      }
      setGap(null);
      if (data.items) setItems(data.items);
    } catch (e) {
      Toast.show(`Üretilemedi: ${(e as Error).message}. Tekrar dene.`);
    } finally {
      setBusy(false);
      setGenerating(false);
    }
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          {plan.stage === "taslak" ? (
            <div className="flex flex-1 flex-col gap-2">
              <input
                aria-label="Başlık"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveMeta}
                className="w-full max-w-[420px] rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-[family-name:var(--font-display)] text-2xl font-semibold hover:border-[var(--border)] focus:border-[var(--border-strong)] focus:outline-none"
              />
              <div className="font-mono text-[12px] text-[var(--text-mute)]">{brand.name}</div>
            </div>
          ) : (
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{plan.title}</h1>
              <p className="mt-1 font-mono text-[12.5px] text-[var(--text-mute)]">
                {brand.name} · {trRange(plan.rangeStart, plan.rangeEnd)}
              </p>
            </div>
          )}
          <StageBadge stage={plan.stage} />
        </div>

        {/* Uploading stays open at every stage — a revision can bring a new photo,
            or a video that wasn't ready at "Takvimi üret" time can show up days
            later, even after the plan has gone to the brand. */}
        <ContentUploader planId={plan.id} initialAssets={assets} driveEnabled={driveEnabled} driveFolderUrl={plan.driveFolderUrl} reelLinks={plan.reelLinks} />

        <ShootAnalysis planId={plan.id} />

        {plan.stage === "taslak" && (
            <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
                  Plan kuralları
                </h2>
                <button
                  type="button"
                  onClick={suggest}
                  disabled={suggesting || busy}
                  className="rounded-md border border-[var(--brand)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-50"
                >
                  {suggesting ? "Öneriliyor…" : "Plan öner"}
                </button>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 text-[12px] text-[var(--text-dim)]">
                <span className="font-semibold">Takvim aralığı</span>
                <input
                  aria-label="Başlangıç"
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  onBlur={saveMeta}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 font-mono"
                />
                –
                <input
                  aria-label="Bitiş"
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  onBlur={saveMeta}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 font-mono"
                />
                <span className="text-[11px] text-[var(--text-mute)]">
                  içeriğini yükledikten sonra buradan ayarla
                </span>
              </div>

              <textarea
                aria-label="Plan promptu"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onBlur={saveMeta}
                placeholder="Örn: 2 günde bir post, her gün story, haftada 1 reels. 7 Eylül'e özel post. Story'lere açıklama yazma."
                className="min-h-[96px] w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] p-3 text-[13px] leading-6"
              />
              {suggestion && (
                <div className="mt-2 rounded-lg border border-[var(--brand-soft)] bg-[var(--brand-soft)] p-3 text-[12.5px]">
                  <p className="text-[var(--text-dim)]">{suggestion.note}</p>
                  <p className="mt-1.5 rounded bg-[var(--bg)] p-2 leading-5">{suggestion.prompt}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={applySuggestion}
                      className="rounded-md bg-[var(--brand)] px-3 py-1 text-[11.5px] font-semibold text-[var(--brand-ink)]"
                    >
                      Uygula
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestion(null)}
                      className="rounded-md px-3 py-1 text-[11.5px] text-[var(--text-mute)]"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              )}
            </div>
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
          <GenerateProgress estimatedMs={estimateGenerateMs(genItemCount, plan.visionEnabled)} />
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

        {items.length > 0 && plan.stage === "taslak" && <CalendarReview planId={plan.id} />}

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
          highlightItemId={highlightItemId}
          annotations={annotations}
          openPinsForItemId={openPinsFor}
          onPinsOpened={() => setOpenPinsFor(null)}
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
        <FeedbackInbox
          comments={comments}
          annotations={annotations}
          items={items}
          onJump={jumpToItem}
          onCaption={(itemId, caption) => {
            const next = items.map((i) => (i.id === itemId ? { ...i, caption } : i));
            setItems(next);
            persist(next);
          }}
        />
      </aside>

      <GapModal
        open={gap !== null}
        preview={gap ?? { extendCount: 0, stopCount: 0 }}
        onPick={(mode) => applyGenerate(mode, mode === "extend" ? gap!.extendCount : gap!.stopCount)}
        onClose={() => setGap(null)}
      />
    </div>
  );
}
