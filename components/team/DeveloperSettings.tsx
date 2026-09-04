"use client";

import { useState } from "react";
import type { AppSettings, Language } from "@/lib/types";
import { Toast } from "@/components/ui/Toast";
import { LogoUpload } from "./LogoUpload";

/** Recommended source size, so an uploaded photo is not upscaled on a big screen. */
const BG_ADVICE = "Önerilen: 2560 × 1440 px (16:9), JPG ya da WebP, 1 MB altı.";
const LOGO_ADVICE = "Önerilen: yüksekliği en az 56 px, arkaplanı şeffaf PNG ya da SVG.";

export function DeveloperSettings({ initial }: { initial: AppSettings }) {
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const patch = (next: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...next }));
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        Toast.show(d.error === "forbidden" ? "Bu ayarlar için geliştirici girişi gerekiyor" : "Kaydedilemedi");
        return;
      }
      setSettings(await res.json());
      setSaved(true);
    } catch (e) {
      Toast.show(`Kaydedilemedi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const bg = settings.background;
  const setBg = (b: Partial<typeof bg>) => patch({ background: { ...bg, ...b } });

  return (
    <div className="flex flex-col gap-5">
      <Section title="Logo" hint={LOGO_ADVICE}>
        <LogoUpload
          value={settings.logoUrl ?? ""}
          color={bg.color}
          onChange={(url) => patch({ logoUrl: url })}
        />
        {settings.logoUrl && (
          <button
            type="button"
            onClick={() => patch({ logoUrl: null })}
            className="mt-2 text-[12px] text-[var(--text-mute)] underline"
          >
            logoyu kaldır, “Osiris” yazısına dön
          </button>
        )}
      </Section>

      <Section title="Arkaplan" hint={BG_ADVICE}>
        <LogoUpload
          value={bg.imageUrl ?? ""}
          color={bg.color}
          onChange={(url) => setBg({ imageUrl: url })}
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-[12.5px] text-[var(--text-dim)]">
            Görünürlük <b className="font-mono">%{bg.opacity}</b>
            <input
              aria-label="Görünürlük"
              type="range"
              min={0}
              max={100}
              value={bg.opacity}
              onChange={(e) => setBg({ opacity: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <label className="text-[12.5px] text-[var(--text-dim)]">
            Bulanıklık <b className="font-mono">{bg.blur}px</b>
            <input
              aria-label="Bulanıklık"
              type="range"
              min={0}
              max={40}
              value={bg.blur}
              onChange={(e) => setBg({ blur: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <label className="text-[12.5px] text-[var(--text-dim)]">
            Arka renk
            <input
              aria-label="Arka renk"
              type="color"
              value={bg.color}
              onChange={(e) => setBg({ color: e.target.value })}
              className="mt-1 h-9 w-full rounded border border-[var(--border-strong)]"
            />
          </label>
        </div>

        <p className="mt-2 text-[11.5px] text-[var(--text-mute)]">
          Görünürlüğü kıstıkça arkadaki renk daha çok görünür — ikisini birlikte ayarla.
        </p>

        <div className="relative mt-3 h-28 overflow-hidden rounded-[var(--r-md)] border border-[var(--border)]">
          <div className="absolute inset-0" style={{ background: bg.color }} />
          {bg.imageUrl && (
            <div
              className="absolute inset-0 scale-105 bg-cover bg-center"
              style={{
                backgroundImage: `url(${bg.imageUrl})`,
                opacity: bg.opacity / 100,
                filter: bg.blur ? `blur(${bg.blur}px)` : undefined,
              }}
            />
          )}
          <span className="absolute bottom-2 left-3 text-[11px] text-white/80">önizleme</span>
        </div>
      </Section>

      <Section title="Genel">
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-dim)]">
          Varsayılan dil
          <select
            aria-label="Varsayılan dil"
            value={settings.defaultLanguage}
            onChange={(e) => patch({ defaultLanguage: e.target.value as Language })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[13px]"
          >
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </label>

        <label className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--text-dim)]">
          Medya saklama süresi
          <input
            aria-label="Medya saklama süresi"
            type="number"
            min={1}
            max={365}
            value={settings.mediaRetentionDays}
            onChange={(e) => patch({ mediaRetentionDays: Number(e.target.value) })}
            className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[13px]"
          />
          gün (takvim bittikten sonra dosyalar silinir)
        </label>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)] disabled:opacity-60"
        >
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {saved && <span className="text-[12.5px] text-[var(--ok)]">Kaydedildi</span>}
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">{title}</h2>
      {hint && <p className="mb-3 mt-1 text-[11.5px] text-[var(--text-mute)]">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}
