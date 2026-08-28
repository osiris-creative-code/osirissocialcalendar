"use client";

import { Modal } from "@/components/ui/Modal";

export function GapModal({
  open,
  preview,
  onPick,
  onClose,
}: {
  open: boolean;
  preview: { extendCount: number; stopCount: number };
  onPick: (mode: "extend" | "stopAtAssets") => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="gap-title">
      <h3 id="gap-title" className="font-[family-name:var(--font-display)] text-lg">
        İçerik kurala yetişmiyor
      </h3>
      <p className="mt-2 text-[13px] text-[var(--text-dim)]">
        Kurallar {preview.extendCount} slot istiyor, Drive&apos;daki içerikle {preview.stopCount} tanesi
        doluyor.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onPick("extend")}
          className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-3 text-left text-[13px] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]"
        >
          <b className="block text-[13.5px]">Kurala kadar uzat</b>
          <span className="text-[12px] text-[var(--text-mute)]">
            Boş slotlar bırakılır, sonra sen doldurursun (markaya gösterilmez)
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPick("stopAtAssets")}
          className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-3 text-left text-[13px] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]"
        >
          <b className="block text-[13.5px]">İçerikte bitir</b>
          <span className="text-[12px] text-[var(--text-mute)]">
            Plan {preview.stopCount} dolu öğeyle biter, kalan günler atlanır
          </span>
        </button>
      </div>
    </Modal>
  );
}
