"use client";

import { useRef, useState } from "react";

/** Logo picker: preview + file upload (straight to storage) + URL fallback. */
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
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const target = await (
        await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: file.name }),
        })
      ).json();

      if (target.mode === "supabase") {
        await fetch(target.signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type || "application/octet-stream", "x-upsert": "true" },
          body: file,
        });
      } else {
        await fetch(target.uploadPath, { method: "PUT", body: file });
      }
      onChange(target.publicUrl);
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
      </div>
    </div>
  );
}
