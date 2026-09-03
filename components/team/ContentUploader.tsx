"use client";

import { useState } from "react";
import type { ItemType, PlanAsset } from "@/lib/types";
import { isWebPlayableVideo } from "@/lib/media-format";

/** Grab the first frame of a video as a JPEG data blob, upload it, return its URL. Best-effort. */
async function grabPoster(file: File): Promise<string | null> {
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = url;
    const dataUrl = await new Promise<string | null>((resolve) => {
      const done = (v: string | null) => {
        URL.revokeObjectURL(url);
        resolve(v);
      };
      const timer = setTimeout(() => done(null), 4000);
      video.onloadeddata = () => {
        video.currentTime = Math.min(0.1, video.duration || 0.1);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 720;
          canvas.height = video.videoHeight || 1280;
          canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
          clearTimeout(timer);
          done(canvas.toDataURL("image/jpeg", 0.7));
        } catch {
          clearTimeout(timer);
          done(null);
        }
      };
      video.onerror = () => {
        clearTimeout(timer);
        done(null);
      };
    });
    if (!dataUrl) return null;
    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData();
    fd.append("file", blob, `${file.name.replace(/\.[^.]+$/, "")}-poster.jpg`);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    if (!res.ok) return null;
    return ((await res.json()) as { url?: string }).url ?? null;
  } catch {
    return null;
  }
}

const GROUPS: { type: ItemType; label: string; accept: string }[] = [
  { type: "post", label: "Post görselleri", accept: "image/*" },
  { type: "story", label: "Story görselleri", accept: "image/*" },
  { type: "reel", label: "Reels videoları", accept: "video/*" },
];

type Progress = { done: number; total: number; pct: number };

function xhrPut(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
}

export function ContentUploader({
  planId,
  initialAssets,
  driveEnabled = false,
  driveFolderUrl = null,
}: {
  planId: string;
  initialAssets: PlanAsset[];
  driveEnabled?: boolean;
  driveFolderUrl?: string | null;
}) {
  const [assets, setAssets] = useState<PlanAsset[]>(initialAssets);
  const [progress, setProgress] = useState<Partial<Record<ItemType, Progress>>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [driveMsg, setDriveMsg] = useState("");
  const [driveLink, setDriveLink] = useState(driveFolderUrl ?? "");
  const [driveSaved, setDriveSaved] = useState(false);

  const saveDriveLink = async () => {
    setDriveSaved(false);
    const res = await fetch(`/api/plans/${planId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ driveFolderUrl: driveLink.trim() || null }),
    });
    if (res.ok) setDriveSaved(true);
  };

  const pullDrive = async () => {
    if (working) return;
    if (driveLink.trim() && driveLink.trim() !== (driveFolderUrl ?? "")) await saveDriveLink();
    setWorking(true);
    setError("");
    setDriveMsg("Drive taranıyor…");
    try {
      const res = await fetch(`/api/plans/${planId}/import-drive`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Drive'dan çekilemedi.");
        setDriveMsg("");
        return;
      }
      const fresh = await fetch(`/api/plans/${planId}/assets`).then((r) => r.json());
      setAssets(fresh as PlanAsset[]);
      const failed = (data.failed as { name: string }[] | undefined)?.length ?? 0;
      setDriveMsg(
        `${data.imported} yeni · ${data.skipped} zaten vardı${failed ? ` · ${failed} başarısız` : ""}`,
      );
    } finally {
      setWorking(false);
    }
  };

  const upload = async (type: ItemType, files: FileList | null) => {
    if (!files || files.length === 0 || working) return;
    const list = Array.from(files);
    setError("");
    setWorking(true);
    setProgress({ [type]: { done: 0, total: list.length, pct: 0 } });

    try {
      const recorded: {
        type: ItemType;
        kind: "image" | "video";
        url: string;
        name: string;
        posterUrl?: string;
      }[] = [];
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
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

        const ok = await xhrPut(
          target.mode === "supabase" ? target.signedUrl : target.uploadPath,
          file,
          target.mode === "supabase"
            ? { "content-type": file.type || "application/octet-stream" }
            : {},
          (pct) =>
            setProgress({
              [type]: { done: i, total: list.length, pct: Math.round((i * 100 + pct) / list.length) },
            }),
        );
        if (!ok) {
          setError("Depoya yüklenemedi.");
          return;
        }

        const isVideo = file.type.startsWith("video") || !isWebPlayableVideo(file.name);
        const posterUrl =
          isVideo && type === "reel" ? (await grabPoster(file)) ?? undefined : undefined;
        recorded.push({
          type,
          kind: file.type.startsWith("video") ? "video" : "image",
          url: target.publicUrl,
          name: file.name,
          ...(posterUrl ? { posterUrl } : {}),
        });
        setProgress({
          [type]: { done: i + 1, total: list.length, pct: Math.round(((i + 1) * 100) / list.length) },
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
      setProgress({});
      setWorking(false);
    }
  };

  const addReelPlaceholder = async () => {
    if (working) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/plans/${planId}/assets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [
            { type: "reel", kind: "video", url: "", name: "Reels placeholder", placeholder: true },
          ],
        }),
      });
      if (res.ok) {
        const added = (await res.json()) as PlanAsset[];
        setAssets((a) => [...a, ...added]);
      } else {
        setError("Placeholder eklenemedi.");
      }
    } finally {
      setWorking(false);
    }
  };

  const remove = async (id: string) => {
    if (working) return;
    setWorking(true);
    try {
      await fetch(`/api/plans/${planId}/assets?assetId=${id}`, { method: "DELETE" });
      setAssets((a) => a.filter((x) => x.id !== id));
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
        İçerik
      </h2>
      <p className="mb-3 text-[12px] text-[var(--text-mute)]">
        Bu çekimin görsellerini/videolarını buraya yükle ya da Drive klasöründen çek. Yüklemezsen
        örnek içerikle üretilir.
      </p>

      {error && <p className="mb-3 text-[12px] text-[var(--accent)]">{error}</p>}

      {driveEnabled && (
        <div className="mb-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Drive klasör linki"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              onBlur={saveDriveLink}
              placeholder="https://drive.google.com/drive/folders/… (bu çekimin klasörü)"
              className="min-w-[220px] flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px]"
            />
            <button
              type="button"
              onClick={pullDrive}
              disabled={working || !driveLink.trim()}
              className="rounded-md border border-[var(--brand)] px-3 py-1.5 text-[12px] font-semibold text-[var(--brand)] disabled:opacity-50"
            >
              Drive&apos;dan çek
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--text-mute)]">
            İçindeki POST / STORY / REELS (ve “… EK”) alt klasörlerinden çekilir; CROP klasörleri
            atlanır. “KAYDIRMALI 1/2/3” alt klasörleri tek bir carousel olur.
            {driveSaved && <span className="text-[var(--ok)]"> · link kaydedildi</span>}
            {driveMsg && <span className="text-[var(--text-dim)]"> · {driveMsg}</span>}
          </p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {GROUPS.map((g) => {
          const count = assets.filter((a) => a.type === g.type).length;
          const p = progress[g.type];
          return (
            <div key={g.type} className="flex flex-col gap-1.5">
              <label className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-dashed border-[var(--border-strong)] bg-[var(--bg)] p-3 text-center text-[12px] text-[var(--text-dim)] hover:border-[var(--brand)]">
                <span className="font-semibold text-[var(--text)]">{g.label}</span>
                {p ? (
                  <span className="text-[var(--brand)]">
                    %{p.pct} · {p.done}/{p.total}
                  </span>
                ) : count > 0 ? (
                  <span className="text-[var(--ok)]">✓ {count} yüklendi</span>
                ) : (
                  <span className="text-[var(--text-mute)]">seç</span>
                )}
                {p && (
                  <span className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <span
                      className="block h-full rounded-full bg-[var(--brand)] transition-[width] duration-200"
                      style={{ width: `${p.pct}%` }}
                    />
                  </span>
                )}
                <input
                  type="file"
                  multiple
                  accept={g.accept}
                  disabled={working}
                  className="hidden"
                  onChange={(e) => upload(g.type, e.target.files)}
                />
              </label>
              {g.type === "reel" && (
                <button
                  type="button"
                  onClick={addReelPlaceholder}
                  disabled={working}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--text-dim)] hover:border-[var(--border-strong)] disabled:opacity-50"
                >
                  ＋ Placeholder (video sonra gelecek)
                </button>
              )}
            </div>
          );
        })}
      </div>

      {assets.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {assets.map((a) => (
            <li
              key={a.id}
              className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 text-[11.5px] ${
                a.placeholder
                  ? "border-[color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[var(--warn-soft)]"
                  : "border-[var(--border)] bg-[var(--bg)]"
              }`}
            >
              {a.placeholder ? (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--warn)]">
                  ▹
                </span>
              ) : a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--surface-2)]">▶</span>
              )}
              <span className="max-w-[150px] truncate text-[var(--text-dim)]">
                {a.placeholder ? "Reels — video bekleniyor" : a.name}
              </span>
              {a.kind === "video" && a.webPlayable === false && (
                <span
                  title="Tarayıcıda oynamayabilir — MP4 (H.264) yükleyin"
                  className="rounded bg-[var(--warn-soft)] px-1 text-[10px] font-semibold text-[var(--warn)]"
                >
                  MP4 değil
                </span>
              )}
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
