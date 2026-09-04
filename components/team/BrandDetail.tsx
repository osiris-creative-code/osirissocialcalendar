"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { Brand, CaptionLanguage, FontAsset, Plan } from "@/lib/types";
import { CAPTION_LANGUAGE_LABELS, captionLanguageOf } from "@/lib/caption-language";
import { trRange } from "@/lib/format";
import { StageBadge } from "./StageBadge";
import { LogoUpload } from "./LogoUpload";

export function BrandDetail({
  brand,
  plans,
  fonts = [],
}: {
  brand: Brand;
  plans: Plan[];
  /** The shared library uploaded in Geliştirici Ayarları. */
  fonts?: FontAsset[];
}) {
  const router = useRouter();
  const [name, setName] = useState(brand.name);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl);
  const [colorPrimary, setColorPrimary] = useState(brand.colorPrimary);
  const [colorAccent, setColorAccent] = useState(brand.colorAccent);
  const [handle, setHandle] = useState(brand.instagramHandle ?? "");
  const [captionLanguage, setCaptionLanguage] = useState<CaptionLanguage>(captionLanguageOf(brand));
  const [contentRules, setContentRules] = useState(brand.contentRules ?? "");
  const [headingFontId, setHeadingFontId] = useState(brand.headingFontId ?? "");
  const [bodyFontId, setBodyFontId] = useState(brand.bodyFontId ?? "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/brands/${brand.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || brand.name,
        logoUrl,
        colorPrimary,
        colorAccent,
        instagramHandle: handle,
        captionLanguage,
        contentRules: contentRules.trim() || null,
        headingFontId: headingFontId || null,
        bodyFontId: bodyFontId || null,
      }),
    });
    setBusy(false);
    setSaved(res.ok);
    if (res.ok) router.refresh();
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.logoUrl} alt={brand.name} className="h-12 w-12 rounded-xl object-cover" style={{ background: brand.colorPrimary }} />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{brand.name}</h1>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/app/brands/${brand.id}/plans/new`)}
          className="rounded-[10px] bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)]"
        >
          Yeni plan
        </button>
      </div>

      <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">Ayarlar</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] text-[var(--text-dim)]">
            Marka adı
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]" />
          </label>
          <div className="text-[13px] text-[var(--text-dim)] sm:col-span-2">
            Logo
            <div className="mt-1">
              <LogoUpload value={logoUrl} color={colorPrimary} onChange={setLogoUrl} />
            </div>
          </div>
          <label className="text-[13px] text-[var(--text-dim)]">
            Instagram kullanıcı adı
            <input value={handle} onChange={(e) => setHandle(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]" />
          </label>
          <label className="text-[13px] text-[var(--text-dim)]">
            Caption dili
            <select
              aria-label="Caption dili"
              value={captionLanguage}
              onChange={(e) => setCaptionLanguage(e.target.value as CaptionLanguage)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            >
              {(Object.keys(CAPTION_LANGUAGE_LABELS) as CaptionLanguage[]).map((lang) => (
                <option key={lang} value={lang}>
                  {CAPTION_LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11.5px] text-[var(--text-mute)]">
              Bu markanın tüm planlarında geçerli. Tek bir planda istisna istersen plan promptuna yaz.
            </span>
          </label>
          <label className="text-[13px] text-[var(--text-dim)] sm:col-span-2">
            Marka kuralları
            <textarea
              aria-label="Marka kuralları"
              value={contentRules}
              onChange={(e) => setContentRules(e.target.value)}
              rows={3}
              placeholder="Örn: her gün story, 3 günde bir post, haftada 1 reels. Pazar günleri paylaşım yok."
              className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] leading-6"
            />
            <span className="mt-1 block text-[11.5px] text-[var(--text-mute)]">
              “Plan öner” bunu esas alır — her plan için tempoyu yeniden yazmana gerek kalmaz.
            </span>
          </label>
          <label className="text-[13px] text-[var(--text-dim)]">
            Başlık fontu
            <select
              aria-label="Başlık fontu"
              value={headingFontId}
              onChange={(e) => setHeadingFontId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            >
              <option value="">Varsayılan</option>
              {fonts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.supportsTurkish ? "" : " (Türkçe harf yok)"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] text-[var(--text-dim)]">
            Metin fontu
            <select
              aria-label="Metin fontu"
              value={bodyFontId}
              onChange={(e) => setBodyFontId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            >
              <option value="">Varsayılan</option>
              {fonts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.supportsTurkish ? "" : " (Türkçe harf yok)"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]">
            Ana renk
            <input type="color" value={colorPrimary} onChange={(e) => setColorPrimary(e.target.value)} className="h-8 w-10 rounded border border-[var(--border-strong)]" />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]">
            Vurgu rengi
            <input type="color" value={colorAccent} onChange={(e) => setColorAccent(e.target.value)} className="h-8 w-10 rounded border border-[var(--border-strong)]" />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={save} disabled={busy} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)] disabled:opacity-60">
            Kaydet
          </button>
          {saved && <span className="text-[12.5px] text-[var(--ok)]">Kaydedildi</span>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">Planlar</h2>
        <div className="flex flex-col gap-2">
          {plans.length === 0 && <p className="text-[14px] text-[var(--text-mute)]">Henüz plan yok.</p>}
          {plans.map((p) => (
            <Link
              key={p.id}
              href={`/app/plans/${p.id}`}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:border-[var(--border-strong)]"
            >
              <span className="flex items-center gap-3">
                <span className="font-medium">{p.title}</span>
                <span className="font-mono text-[12px] text-[var(--text-mute)]">
                  {trRange(p.rangeStart, p.rangeEnd)}
                </span>
              </span>
              <StageBadge stage={p.stage} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
