"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Annotation, ItemType, Media, Plan, PlanItem, PlanTheme } from "@/lib/types";
import { trDayMonth } from "@/lib/format";
import { groupByDate, moveItem, normalize } from "@/lib/planner/reorder";
import { PinLightbox } from "./PinLightbox";

const TYPE_LABEL: Record<ItemType, string> = {
  post: "POST",
  story: "STORY",
  reel: "REEL",
  special: "GÜNE ÖZEL",
};

type PinTarget = { title: string; media: Media | null; pins: Annotation[] };

export function PlanEditor({
  plan,
  items,
  onChange,
  onThemeChange,
  onRewrite,
  onVisionChange,
  highlightItemId,
  annotations,
  openPinsForItemId,
  onPinsOpened,
}: {
  plan: Plan;
  items: PlanItem[];
  onChange: (items: PlanItem[]) => void;
  onThemeChange?: (theme: PlanTheme) => void;
  onRewrite?: (itemId: string, instruction: string) => Promise<void> | void;
  onVisionChange?: (enabled: boolean) => void;
  /** Briefly ring-highlights this row and is expected to already be scrolled into view. */
  highlightItemId?: string | null;
  /** Pin annotations left on specific images — shown per row, click to enlarge. */
  annotations?: Annotation[];
  /** Set by the feedback inbox to pop the pinned image open straight away. */
  openPinsForItemId?: string | null;
  onPinsOpened?: () => void;
}) {
  const [rows, setRows] = useState<PlanItem[]>(items);
  const [theme, setTheme] = useState<PlanTheme>(plan.theme);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [vision, setVision] = useState(plan.visionEnabled);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pinTarget, setPinTarget] = useState<PinTarget | null>(null);

  // Keeping the latest values in refs lets every row callback stay referentially
  // stable, so typing in one caption no longer re-renders all the other rows.
  const rowsRef = useRef(rows);
  const onChangeRef = useRef(onChange);
  const lastEmitted = useRef<PlanItem[] | null>(null);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Adopt items coming from the server/parent, but ignore the echo of our own
  // last emit — that round trip used to double every render.
  useEffect(() => {
    if (items === lastEmitted.current) return;
    rowsRef.current = items;
    setRows(items);
  }, [items]);

  const commit = useCallback((updater: (prev: PlanItem[]) => PlanItem[]) => {
    const next = updater(rowsRef.current);
    rowsRef.current = next;
    lastEmitted.current = next;
    setRows(next);
    onChangeRef.current(next);
  }, []);

  const setCaption = useCallback(
    (id: string, caption: string) =>
      commit((prev) => prev.map((r) => (r.id === id ? { ...r, caption } : r))),
    [commit],
  );

  const setDate = useCallback(
    (id: string, date: string) =>
      commit((prev) => normalize(prev.map((r) => (r.id === id ? { ...r, date } : r)))),
    [commit],
  );

  const remove = useCallback(
    (id: string) => commit((prev) => normalize(prev.filter((r) => r.id !== id))),
    [commit],
  );

  const fillGap = useCallback(
    (id: string) =>
      commit((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                isGap: false,
                media: [{ url: "/demo/ph-3.svg", kind: "image" as const, slideOrder: 1 }],
                caption: r.type === "story" ? null : "Yeni görsel — açıklama ekleyin.",
              }
            : r,
        ),
      ),
    [commit],
  );

  const rewrite = useCallback(
    async (id: string, instruction: string) => {
      if (!onRewrite) return;
      setBusyId(id);
      await onRewrite(id, instruction);
      setBusyId(null);
    },
    [onRewrite],
  );

  const pinsByItem = useMemo(() => {
    const map = new Map<string, Annotation[]>();
    for (const a of annotations ?? []) {
      map.set(a.planItemId, [...(map.get(a.planItemId) ?? []), a]);
    }
    return map;
  }, [annotations]);

  const openPins = useCallback(
    (itemId: string, mediaIndex: number) => {
      const row = rowsRef.current.find((r) => r.id === itemId);
      if (!row) return;
      const pins = (pinsByItem.get(itemId) ?? []).filter((p) => p.mediaIndex === mediaIndex);
      if (pins.length === 0) return;
      setPinTarget({
        title: `${trDayMonth(row.date)} · ${TYPE_LABEL[row.type]}`,
        media: row.media[mediaIndex] ?? null,
        pins,
      });
    },
    [pinsByItem],
  );

  // The feedback inbox asks for a pinned image to be shown; open the first one.
  useEffect(() => {
    if (!openPinsForItemId) return;
    const pins = pinsByItem.get(openPinsForItemId);
    if (pins?.length) openPins(openPinsForItemId, pins[0].mediaIndex);
    onPinsOpened?.();
  }, [openPinsForItemId, pinsByItem, openPins, onPinsOpened]);

  const updateTheme = (patch: Partial<PlanTheme>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    onThemeChange?.(next);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (e: DragStartEvent) => setDragId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const over = e.over;
    if (!over) return;
    commit((prev) => moveItem(prev, String(e.active.id), String(over.id)));
  };

  const groups = useMemo(() => groupByDate(rows), [rows]);
  const dragging = dragId ? rows.find((r) => r.id === dragId) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <DndContext
        // Without a fixed id, dnd-kit's auto-incrementing ids differ between the
        // server render and hydration, which React flags as a mismatch.
        id="plan-editor-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragId(null)}
      >
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.date} className="flex flex-col gap-1.5">
              <h3 className="px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-mute)]">
                {trDayMonth(group.date)}
              </h3>
              <SortableContext
                items={group.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-2">
                  {group.items.map((row) => (
                    <PlanRow
                      key={row.id}
                      row={row}
                      pins={pinsByItem.get(row.id) ?? []}
                      highlighted={row.id === highlightItemId}
                      busy={busyId === row.id}
                      canRewrite={!!onRewrite}
                      onCaption={setCaption}
                      onDate={setDate}
                      onRemove={remove}
                      onFillGap={fillGap}
                      onRewrite={rewrite}
                      onOpenPins={openPins}
                    />
                  ))}
                </ul>
              </SortableContext>
            </section>
          ))}
        </div>

        <DragOverlay>
          {dragging ? (
            <div className="rounded-[10px] border border-[var(--accent)] bg-[var(--surface)] px-3 py-2 text-[12.5px] font-semibold shadow">
              {trDayMonth(dragging.date)} · {TYPE_LABEL[dragging.type]}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {rows.length === 0 && (
        <p className="rounded-[10px] border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[13px] text-[var(--text-mute)]">
          Henüz öğe yok. “Takvimi üret”e bas.
        </p>
      )}

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

      <PinLightbox
        open={pinTarget !== null}
        onClose={() => setPinTarget(null)}
        media={pinTarget?.media ?? null}
        pins={pinTarget?.pins ?? []}
        title={pinTarget?.title ?? ""}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * One row. memo'd so editing a caption doesn't repaint the whole plan.
 * ------------------------------------------------------------------ */
const PlanRow = memo(function PlanRow({
  row,
  pins,
  highlighted,
  busy,
  canRewrite,
  onCaption,
  onDate,
  onRemove,
  onFillGap,
  onRewrite,
  onOpenPins,
}: {
  row: PlanItem;
  pins: Annotation[];
  highlighted: boolean;
  busy: boolean;
  canRewrite: boolean;
  onCaption: (id: string, caption: string) => void;
  onDate: (id: string, date: string) => void;
  onRemove: (id: string) => void;
  onFillGap: (id: string) => void;
  onRewrite: (id: string, instruction: string) => void;
  onOpenPins: (id: string, mediaIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const [steer, setSteer] = useState("");

  const pinsByMedia = useMemo(() => {
    const map = new Map<number, Annotation[]>();
    for (const pin of pins) map.set(pin.mediaIndex, [...(map.get(pin.mediaIndex) ?? []), pin]);
    return [...map.entries()];
  }, [pins]);

  return (
    <li
      ref={setNodeRef}
      id={`plan-item-${row.id}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-2 rounded-[10px] border px-3 py-2.5 transition-shadow ${
        row.isGap
          ? "border-l-[3px] border-[color-mix(in_srgb,var(--gold)_45%,transparent)] border-l-[var(--warn)] bg-[var(--warn-soft)]"
          : "border-[var(--border)] bg-[var(--bg)]"
      } ${highlighted ? "ring-2 ring-[var(--accent)]" : ""} ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="grid grid-cols-[22px_58px_auto_1fr_auto] items-center gap-3">
        <button
          type="button"
          aria-label="Sürükle"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-center text-[13px] text-[var(--text-mute)] active:cursor-grabbing"
        >
          ⠿
        </button>
        <span className="text-center font-mono text-[11px] leading-tight text-[var(--text-dim)]">
          {row.date.slice(5)}
          <br />
          {TYPE_LABEL[row.type]}
        </span>
        {row.media[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.media[0].url}
            alt=""
            className="h-10 w-8 rounded border border-[var(--border)] object-cover"
          />
        ) : (
          <span className="h-10 w-8 rounded border border-[var(--border)] bg-[var(--surface-2)]" />
        )}

        {row.isGap ? (
          <span className="flex items-center gap-2 text-[12.5px] text-[var(--warn)]">
            İçerik eksik
            <button
              type="button"
              onClick={() => onFillGap(row.id)}
              className="rounded-[7px] border border-[var(--warn)] px-2 py-1 text-[11.5px] font-semibold"
            >
              Drive&apos;dan seç
            </button>
          </span>
        ) : row.type === "story" ? (
          <span className="text-[13px] text-[var(--text-mute)]">—</span>
        ) : (
          <CaptionField
            id={row.id}
            label={`${TYPE_LABEL[row.type]} açıklaması`}
            value={row.caption ?? ""}
            onCommit={onCaption}
          />
        )}

        <span className="flex items-center gap-1">
          <input
            aria-label="Tarih"
            type="date"
            value={row.date}
            onChange={(e) => onDate(row.id, e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-[11px]"
          />
          <button
            type="button"
            aria-label="Kaldır"
            onClick={() => onRemove(row.id)}
            className="grid h-6 w-6 place-items-center rounded text-[var(--text-mute)] hover:bg-[var(--surface-2)]"
          >
            ×
          </button>
        </span>
      </div>

      {canRewrite && !row.isGap && row.type !== "story" && (
        <div className="flex items-center gap-2 pl-[80px]">
          <input
            aria-label="Yeniden yaz yönergesi"
            value={steer}
            onChange={(e) => setSteer(e.target.value)}
            placeholder="yönerge (ops.): kısalt, daha eğlenceli…"
            className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11.5px]"
          />
          <button
            type="button"
            onClick={() => onRewrite(row.id, steer)}
            disabled={busy}
            className="whitespace-nowrap rounded-[7px] border border-[var(--border-strong)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--brand)] disabled:opacity-60"
          >
            {busy ? "…" : "↻ Yeniden yaz"}
          </button>
        </div>
      )}

      {pinsByMedia.length > 0 && (
        <div className="flex flex-col gap-2 pl-[80px]">
          {pinsByMedia.map(([mediaIndex, mediaPins]) => {
            const media = row.media[mediaIndex];
            return (
              <div key={mediaIndex} className="flex gap-3">
                {media && (
                  <button
                    type="button"
                    aria-label="İşaretli görseli büyüt"
                    onClick={() => onOpenPins(row.id, mediaIndex)}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded border border-[var(--border-strong)] hover:border-[var(--accent)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media.url} alt="" className="h-full w-full object-cover" />
                    {mediaPins.map((pin, i) => (
                      <span
                        key={pin.id}
                        title={pin.note}
                        className="absolute grid h-4 w-4 -translate-x-1/2 -translate-y-full place-items-center rounded-[50%_50%_50%_2px] bg-[var(--accent)] text-[9px] font-bold text-white"
                        style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </button>
                )}
                <ul className="flex flex-1 flex-col justify-center gap-1 text-[12px] text-[var(--text-dim)]">
                  {mediaPins.map((pin, i) => (
                    <li key={pin.id}>
                      <b className="text-[var(--accent)]">#{i + 1}</b> {pin.note}
                      <span className="text-[var(--text-mute)]"> — {pin.authorName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
});

/**
 * Caption box that keeps its own draft and only tells the plan about it on blur
 * (with an idle safety net). Propagating every keystroke re-rendered every row
 * in the plan, which is what made typing feel laggy.
 */
function CaptionField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (id: string, caption: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt changes that came from elsewhere (e.g. "Yeniden yaz").
  useEffect(() => setDraft(value), [value]);
  useEffect(() => () => void (idle.current && clearTimeout(idle.current)), []);

  const flush = (text: string) => {
    if (idle.current) clearTimeout(idle.current);
    if (text !== value) onCommit(id, text);
  };

  return (
    <textarea
      aria-label={label}
      value={draft}
      rows={2}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        if (idle.current) clearTimeout(idle.current);
        idle.current = setTimeout(() => flush(text), 1500);
      }}
      onBlur={() => flush(draft)}
      className="w-full resize-y rounded border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] focus:border-[var(--border)] focus:bg-[var(--surface)]"
    />
  );
}
