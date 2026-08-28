"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

export function NewBrandModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [colorPrimary, setColorPrimary] = useState("#7A4A2B");
  const [colorAccent, setColorAccent] = useState("#D9982F");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, colorPrimary, colorAccent, instagramHandle }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setInstagramHandle("");
      onCreated();
      onClose();
    } else {
      setError("Marka eklenemedi. Yönetici ya da developer olarak giriş yapın.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-brand-title">
      <h3 id="new-brand-title" className="font-[family-name:var(--font-display)] text-lg">
        Yeni marka
      </h3>
      <form className="mt-4 flex flex-col gap-3" onSubmit={submit}>
        <label className="text-[13px] text-[var(--text-dim)]">
          Marka adı
          <input
            aria-label="Marka adı"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
          />
        </label>
        <label className="text-[13px] text-[var(--text-dim)]">
          Instagram kullanıcı adı (opsiyonel)
          <input
            aria-label="Instagram kullanıcı adı"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
          />
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]">
            Ana renk
            <input aria-label="Ana renk" type="color" value={colorPrimary} onChange={(e) => setColorPrimary(e.target.value)} className="h-8 w-10 rounded border border-[var(--border-strong)]" />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]">
            Vurgu
            <input aria-label="Vurgu rengi" type="color" value={colorAccent} onChange={(e) => setColorAccent(e.target.value)} className="h-8 w-10 rounded border border-[var(--border-strong)]" />
          </label>
        </div>
        {error && <p className="text-[12.5px] text-[var(--accent)]">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-[13px] text-[var(--text-dim)]">
            Vazgeç
          </button>
          <button type="submit" disabled={busy} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)] disabled:opacity-60">
            Ekle
          </button>
        </div>
      </form>
    </Modal>
  );
}
