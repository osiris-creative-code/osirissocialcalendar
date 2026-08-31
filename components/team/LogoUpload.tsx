"use client";

import { useRef, useState } from "react";

/** Logo picker: preview + file upload (server-side) + URL fallback. */
export function LogoUpload({
  value,
  color,
  onChange,
}: {
  value: string;
  color?: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        onChange(data.url as string);
      } else {
        setError(data.error || "Yükleme başarısız.");
      }
    } catch {
      setError("Yükleme başarısız (bağlantı).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={value || "/demo/ph-1.svg"}
        alt="Logo"
        className="h-14 w-14 shrink-0 rounded-xl border border-[var(--border)] object-cover"
        style={{ background: color ?? "var(--surface-2)" }}
      />
      <div className="flex-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[12px] font-semibold text-[var(--brand)] disabled:opacity-60"
        >
          {busy ? "Yükleniyor…" : "Dosya seç"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="veya URL yapıştır"
          className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[12px]"
        />
        {error && <p className="mt-1 text-[11.5px] text-[var(--accent)]">{error}</p>}
      </div>
    </div>
  );
}
