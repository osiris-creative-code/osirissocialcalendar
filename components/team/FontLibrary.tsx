"use client";

import { useRef, useState } from "react";
import type { FontAsset } from "@/lib/types";
import { TURKISH_TEST } from "@/lib/fonts";
import { Toast } from "@/components/ui/Toast";

/**
 * Does this file actually carry Ş, ğ, İ…?
 *
 * Rendering a Turkish letter and the same letter in a font that certainly
 * lacks it gives the same width when the browser has substituted a fallback —
 * that is the tell. Cheap and reliable enough; the developer can still correct
 * it with the checkbox.
 */
async function detectTurkish(family: string, url: string): Promise<boolean> {
  try {
    const face = new FontFace(family, `url(${url})`);
    await face.load();
    document.fonts.add(face);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const width = (text: string, font: string) => {
      ctx.font = font;
      return ctx.measureText(text).width;
    };
    const inFont = width("Ş", `40px "${family}", monospace`);
    const inFallback = width("Ş", "40px monospace");
    const controlInFont = width("S", `40px "${family}", monospace`);
    const controlInFallback = width("S", "40px monospace");
    // "S" should differ from the fallback (proving the face loaded at all);
    // if "Ş" matches the fallback while "S" does not, Ş came from elsewhere.
    const faceLoaded = Math.abs(controlInFont - controlInFallback) > 0.5;
    if (!faceLoaded) return true;
    return Math.abs(inFont - inFallback) > 0.5;
  } catch {
    return true;
  }
}

export function FontLibrary({
  fonts,
  onChange,
}: {
  fonts: FontAsset[];
  onChange: (fonts: FontAsset[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) {
        Toast.show("Font yüklenemedi");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      const name = file.name.replace(/\.[a-z0-9]+$/i, "");
      const family = `osiris-${name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
      const supportsTurkish = await detectTurkish(family, url);
      onChange([
        ...fonts,
        { id: family, name, family, url, supportsTurkish, uploadedAt: new Date().toISOString() },
      ]);
    } catch (e) {
      Toast.show(`Font yüklenemedi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <style>{fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("${f.url}");}`).join("")}</style>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".woff2,.woff,.ttf,.otf,font/*"
          aria-label="Font dosyası"
          onChange={(e) => upload(e.target.files?.[0])}
          className="text-[12.5px] text-[var(--text-dim)]"
        />
        <p className="mt-1 text-[11.5px] text-[var(--text-mute)]">
          .woff2 tercih edilir (en küçük dosya). Yüklenen fontlar tüm markalarda seçilebilir olur.
        </p>
      </div>

      {busy && <p className="text-[12px] text-[var(--text-mute)]">Yükleniyor…</p>}

      {fonts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {fonts.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5"
            >
              <span className="text-[13px] font-semibold">{f.name}</span>
              <span
                className="text-[18px] text-[var(--text-dim)]"
                style={{ fontFamily: `"${f.family}", sans-serif` }}
              >
                {TURKISH_TEST}
              </span>
              <label className="ml-auto flex items-center gap-1.5 text-[11.5px] text-[var(--text-dim)]">
                <input
                  type="checkbox"
                  checked={f.supportsTurkish}
                  onChange={(e) =>
                    onChange(
                      fonts.map((x) =>
                        x.id === f.id ? { ...x, supportsTurkish: e.target.checked } : x,
                      ),
                    )
                  }
                />
                Türkçe karakterler var
              </label>
              <button
                type="button"
                onClick={() => onChange(fonts.filter((x) => x.id !== f.id))}
                className="text-[11.5px] text-[var(--accent)]"
              >
                kaldır
              </button>
              {!f.supportsTurkish && (
                <p className="w-full text-[11px] text-[var(--warn)]">
                  Bu fontta Türkçe harfler yok — metinlerde Ş yerine S, ı yerine i kullanılacak.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
