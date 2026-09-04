"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Annotation, Comment, PlanItem } from "@/lib/types";
import { trDayMonth } from "@/lib/format";
import { ITEM_TYPE_LABELS } from "@/lib/labels";
import { ITEM_TYPE_CHIP } from "@/lib/item-type";
import { ITEM_TYPE_ICONS, PinIcon } from "@/components/ui/icons";
import { spring } from "@/lib/motion";
import { Modal } from "@/components/ui/Modal";
import { Thumb } from "@/components/ui/Thumb";

type Entry = {
  item: PlanItem;
  comments: Comment[];
  annotations: Annotation[];
};

const STAGE_TAG: Record<string, string> = { internal: "İç", brand: "Marka" };

/**
 * What the brand asked for, shown the way the work looks: the picture first.
 * Clicking one opens it big, with the pins on the image and every note beside
 * it, and the caption editable in place — you rarely need to leave this panel.
 */
export function FeedbackInbox({
  comments,
  annotations,
  items,
  onJump,
  onCaption,
}: {
  comments: Comment[];
  annotations: Annotation[];
  items: PlanItem[];
  /** Scroll to the item in the editor (the "düzenle" escape hatch). */
  onJump?: (itemId: string, opts?: { pin?: boolean }) => void;
  /** Save an edited caption straight from the popup. */
  onCaption?: (itemId: string, caption: string) => void;
}) {
  const entries = useMemo<Entry[]>(
    () =>
      items
        .map((item) => ({
          item,
          comments: comments.filter((c) => c.planItemId === item.id),
          annotations: annotations.filter((a) => a.planItemId === item.id),
        }))
        .filter((e) => e.comments.length + e.annotations.length > 0),
    [items, comments, annotations],
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const open = entries.find((e) => e.item.id === openId) ?? null;
  const total = comments.length + annotations.length;

  return (
    <section className="glass rounded-[var(--r-lg)] p-4">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
        Geri bildirim {total > 0 ? `· ${total}` : ""}
      </h2>

      {entries.length === 0 ? (
        <p className="text-[13px] text-[var(--text-mute)]">Henüz yorum yok.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {entries.map((entry) => (
            <FeedbackThumb key={entry.item.id} entry={entry} onOpen={() => setOpenId(entry.item.id)} />
          ))}
        </div>
      )}

      <FeedbackDetail
        entry={open}
        onClose={() => setOpenId(null)}
        onCaption={onCaption}
        onJump={onJump}
      />
    </section>
  );
}

function FeedbackThumb({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  const { item, comments, annotations } = entry;
  const media = item.media[0];
  const TypeIcon = ITEM_TYPE_ICONS[item.type];
  const count = comments.length + annotations.length;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={{ y: -2 }}
      transition={spring}
      aria-label={`${trDayMonth(item.date)} ${ITEM_TYPE_LABELS[item.type]} geri bildirimi`}
      className="group overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] text-left hover:border-[var(--accent)]"
    >
      <span className="relative block aspect-square w-full overflow-hidden">
        <Thumb media={media} className="h-full w-full object-cover" />
        <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {annotations.length > 0 && <PinIcon size={10} />}
          {count}
        </span>
      </span>
      <span className="flex items-center gap-1 px-1.5 py-1">
        <span className={`flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${ITEM_TYPE_CHIP[item.type]}`}>
          <TypeIcon size={10} />
          {ITEM_TYPE_LABELS[item.type]}
        </span>
        <span className="ml-auto font-mono text-[10px] text-[var(--text-mute)]">
          {trDayMonth(item.date)}
        </span>
      </span>
    </motion.button>
  );
}

function FeedbackDetail({
  entry,
  onClose,
  onCaption,
  onJump,
}: {
  entry: Entry | null;
  onClose: () => void;
  onCaption?: (itemId: string, caption: string) => void;
  onJump?: (itemId: string, opts?: { pin?: boolean }) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const item = entry?.item;
  const media = item?.media[0];
  const pins = entry?.annotations ?? [];

  const startEditing = () => {
    setDraft(item?.caption ?? "");
    setEditing(true);
  };

  return (
    <Modal open={!!entry} onClose={onClose} size="lg" labelledBy="feedback-detail-title">
      {item && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 id="feedback-detail-title" className="text-[14px] font-semibold">
              {trDayMonth(item.date)} · {ITEM_TYPE_LABELS[item.type]}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="ml-auto rounded px-2 text-[18px] leading-none text-[var(--text-mute)] hover:text-[var(--text)]"
            >
              ×
            </button>
          </div>

          {media && (
            <div className="relative overflow-hidden rounded-[var(--r-md)] border border-[var(--border)]">
              <Thumb media={media} className="block w-full min-h-[220px]" />
              {pins.map((pin, i) => (
                <PinMarker key={pin.id} pin={pin} index={i} />
              ))}
            </div>
          )}

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-mute)]">
              Açıklama
            </h3>
            {editing ? (
              <div className="mt-1 flex flex-col gap-2">
                <textarea
                  aria-label="Açıklama"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 text-[13px] leading-6"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onCaption?.(item.id, draft);
                      setEditing(false);
                    }}
                    className="rounded-md bg-[var(--brand)] px-3 py-1 text-[12px] font-semibold text-[var(--brand-ink)]"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-md px-3 py-1 text-[12px] text-[var(--text-mute)]"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-[13px] leading-6 text-[var(--text-dim)]">
                {item.caption || <span className="text-[var(--text-mute)]">açıklama yok</span>}
                {onCaption && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="ml-2 text-[12px] text-[var(--brand)] underline"
                  >
                    düzenle
                  </button>
                )}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-mute)]">
              Notlar
            </h3>
            <ul className="mt-1 flex flex-col gap-2">
              {pins.map((pin, i) => (
                <li key={pin.id} className="flex gap-2 text-[12.5px] text-[var(--text-dim)]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    {pin.note}
                    <span className="ml-1 text-[11px] text-[var(--text-mute)]">
                      — {pin.authorName} · {STAGE_TAG[pin.stage]}
                    </span>
                  </span>
                </li>
              ))}
              {entry.comments.map((c) => (
                <li key={c.id} className="border-l-2 border-[var(--brand-soft)] pl-2 text-[12.5px] text-[var(--text-dim)]">
                  {c.body}
                  <span className="ml-1 text-[11px] text-[var(--text-mute)]">
                    — {c.authorName} · {STAGE_TAG[c.stage]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {onJump && (
            <button
              type="button"
              onClick={() => {
                onJump(item.id, { pin: pins.length > 0 });
                onClose();
              }}
              className="self-start text-[12px] text-[var(--brand)] underline"
            >
              takvimde göster ↴
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

/** A numbered pin that reveals its note on hover. */
function PinMarker({ pin, index }: { pin: Annotation; index: number }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-full"
      style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
    >
      <button
        type="button"
        aria-label={`Not ${index + 1}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        data-testid="feedback-pin"
        className="grid h-6 w-6 place-items-center rounded-[50%_50%_50%_2px] bg-[var(--accent)] text-[11px] font-bold text-white shadow"
      >
        {index + 1}
      </button>
      {hover && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-44 -translate-x-1/2 rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-[11.5px] leading-snug text-[var(--text)] shadow-lg"
        >
          {pin.note}
          <span className="mt-0.5 block text-[10px] text-[var(--text-mute)]">{pin.authorName}</span>
        </span>
      )}
    </span>
  );
}
