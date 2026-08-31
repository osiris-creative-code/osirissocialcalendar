"use client";

import { useState } from "react";
import type { ItemType, PlanAsset } from "@/lib/types";

const GROUPS: { type: ItemType; label: string; accept: string }[] = [
  { type: "post", label: "Post görselleri", accept: "image/*" },
  { type: "story", label: "Story görselleri", accept: "image/*" },
  { type: "reel", label: "Reels videoları", accept: "video/*" },
];

export function ContentUploader({
  planId,
  initialAssets,
}: {
  planId: string;
  initialAssets: PlanAsset[];
}) {
  const [assets, setAssets] = useState<PlanAsset[]>(initialAssets);
  const [busy, setBusy] = useState<ItemType | null>(null);
  const [error, setError] = useState("");

  const upload = async (type: ItemType, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(type);
    setError("");
    try {
      const recorded: { type: ItemType; kind: "image" | "video"; url: string; name: string }[] = [];
      for (const file of Array.from(files)) {
        const signRes = await fetch(`/api/plans/${planId}/assets/sign`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: file.name }),
        });
        const target = await signRes.json().catch(() => ({}));
        if (!signRes.ok || !target.mode) {
          setError(target.error || "Yükleme hazırlanamadı.");
          return;
        }

        const put =
          target.mode === "supabase"
            ? await fetch(target.signedUrl, {
                method: "PUT",
                headers: { "content-type": file.type || "application/octet-stream" },
                body: file,
              })
            : await fetch(target.uploadPath, { method: "PUT", body: file });
        if (!put.ok) {
          setError(`Depoya yüklenemedi (${put.status}).`);
          return;
        }

        recorded.push({
          type,
          kind: file.type.startsWith("video") ? "video" : "image",
          url: target.publicUrl,
          name: file.name,
        });
      }

      const res = await fetch(`/api/plans/${planId}/assets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: recorded }),
      });
      if (res.ok) {
        const added = (await res.json()) as PlanAsset[];
        setAssets((a) => [...a, ...added]);
      } else {
        setError("Kayıt başarısız.");
      }
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/plans/${planId}/assets?assetId=${id}`, { method: "DELETE" });
    setAssets((a) => a.filter((x) => x.id !== id));
  };

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
        İçerik
      </h2>
      <p className="mb-3 text-[12px] text-[var(--text-mute)]">
        Drive&apos;dan indirdiğin görselleri/videoları buraya yükle. Yüklemezsen örnek içerikle üretilir.
        “kaydırmalı 1 / 2” isimli dosyalar tek bir carousel olur.
      </p>

      {error && <p className="mb-3 text-[12px] text-[var(--accent)]">{error}</p>}

      <div className="grid gap-2 sm:grid-cols-3">
        {GROUPS.map((g) => {
          const count = assets.filter((a) => a.type === g.type).length;
          return (
            <label
              key={g.type}
              className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-3 text-center text-[12px] text-[var(--text-dim)] hover:border-[var(--brand)]"
            >
              <span className="font-semibold text-[var(--text)]">{g.label}</span>
              <span className="text-[var(--text-mute)]">
                {busy === g.type ? "yükleniyor…" : count > 0 ? `${count} dosya` : "seç"}
              </span>
              <input
                type="file"
                multiple
                accept={g.accept}
                className="hidden"
                onChange={(e) => upload(g.type, e.target.files)}
              />
            </label>
          );
        })}
      </div>

      {assets.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {assets.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] py-1 pl-1 pr-2 text-[11.5px]"
            >
              {a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--surface-2)]">▶</span>
              )}
              <span className="max-w-[140px] truncate text-[var(--text-dim)]">{a.name}</span>
              <button
                type="button"
                onClick={() => remove(a.id)}
                aria-label="Kaldır"
                className="text-[var(--text-mute)] hover:text-[var(--accent)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
