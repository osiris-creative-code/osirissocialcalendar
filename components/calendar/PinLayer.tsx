"use client";

import { useState } from "react";
import type { Annotation } from "@/lib/types";

type Draft = { xPct: number; yPct: number };

export function PinLayer({
  annotations,
  mediaIndex,
  onAdd,
  onDelete,
  readOnly = false,
}: {
  annotations: Annotation[];
  mediaIndex: number;
  onAdd: (mediaIndex: number, xPct: number, yPct: number, note: string) => void;
  onDelete: (annotationId: string) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [text, setText] = useState("");

  const pins = annotations.filter((a) => a.mediaIndex === mediaIndex);

  return (
    <div
      data-testid="pin-layer"
      className="absolute inset-0"
      onClick={(e) => {
        if (readOnly) return;
        const r = e.currentTarget.getBoundingClientRect();
        const xPct = ((e.clientX - r.left) / r.width) * 100;
        const yPct = ((e.clientY - r.top) / r.height) * 100;
        setDraft({ xPct, yPct });
        setText("");
        setOpenId(null);
      }}
    >
      {pins.map((a, i) => (
        <span
          key={a.id}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${a.xPct}%`, top: `${a.yPct}%` }}
        >
          <button
            type="button"
            aria-label={`Not ${i + 1}`}
            onMouseEnter={() => setHoverId(a.id)}
            onMouseLeave={() => setHoverId((h) => (h === a.id ? null : h))}
            onFocus={() => setHoverId(a.id)}
            onBlur={() => setHoverId((h) => (h === a.id ? null : h))}
            onClick={(e) => {
              e.stopPropagation();
              setOpenId(openId === a.id ? null : a.id);
              setDraft(null);
            }}
            className="grid h-5 w-5 place-items-center rounded-[50%_50%_50%_2px] bg-[var(--accent)] text-[11px] font-bold text-white shadow"
          >
            {i + 1}
          </button>

          {/* Hovering a pin should read its note without opening anything. */}
          {hoverId === a.id && openId !== a.id && (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-44 -translate-x-1/2 rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-[11.5px] leading-snug text-[var(--text)] shadow-lg"
            >
              {a.note}
              <span className="mt-0.5 block text-[10px] text-[var(--text-mute)]">{a.authorName}</span>
            </span>
          )}
        </span>
      ))}

      {openId && (
        <Popover
          x={pins.find((p) => p.id === openId)!.xPct}
          y={pins.find((p) => p.id === openId)!.yPct}
          initial={pins.find((p) => p.id === openId)!.note}
          onSave={() => setOpenId(null)}
          onDelete={() => {
            onDelete(openId);
            setOpenId(null);
          }}
          readOnly
        />
      )}

      {draft && (
        <Popover
          x={draft.xPct}
          y={draft.yPct}
          initial={text}
          onSave={(value) => {
            if (value.trim()) onAdd(mediaIndex, draft.xPct, draft.yPct, value.trim());
            setDraft(null);
          }}
          onDelete={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function Popover({
  x,
  y,
  initial,
  onSave,
  onDelete,
  readOnly = false,
}: {
  x: number;
  y: number;
  initial: string;
  onSave: (value: string) => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div
      className="absolute z-10 w-52 -translate-x-1/2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] p-2.5"
      style={{ left: `${x}%`, top: `calc(${y}% + 10px)`, boxShadow: "var(--shadow-lg)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        aria-label="Düzeltme notu"
        value={value}
        readOnly={readOnly}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Bu noktada ne değişsin?"
        className="min-h-[52px] w-full resize-y rounded-[7px] border border-[var(--border)] bg-[var(--bg)] p-2 text-[12.5px]"
      />
      <div className="mt-1.5 flex justify-between">
        <button type="button" onClick={onDelete} className="rounded-md px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]">
          Sil
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onSave(value)}
            className="rounded-md bg-[var(--brand)] px-2.5 py-1 text-[12px] font-semibold text-[var(--brand-ink)]"
          >
            Kaydet
          </button>
        )}
      </div>
    </div>
  );
}
