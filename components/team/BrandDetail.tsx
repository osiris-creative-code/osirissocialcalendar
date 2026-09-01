"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { Brand, BrandSource, Plan } from "@/lib/types";
import { trRange } from "@/lib/format";
import { StageBadge } from "./StageBadge";
import { LogoUpload } from "./LogoUpload";

export function BrandDetail({
  brand,
  sources,
  plans,
}: {
  brand: Brand;
  sources: BrandSource[];
  plans: Plan[];
}) {
  const router = useRouter();
  const [name, setName] = useState(brand.name);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl);
  const [colorPrimary, setColorPrimary] = useState(brand.colorPrimary);
  const [colorAccent, setColorAccent] = useState(brand.colorAccent);
  const [handle, setHandle] = useState(brand.instagramHandle ?? "");
  const [phone, setPhone] = useState(brand.phone ?? "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const driveSource = sources.find((s) => s.kind === "drive_folder");
  const driveFolderId = typeof driveSource?.config?.folderId === "string" ? driveSource.config.folderId : "";
  const [driveUrl, setDriveUrl] = useState(driveFolderId ? `https://drive.google.com/drive/folders/${driveFolderId}` : "");
  const [driveMsg, setDriveMsg] = useState("");

  const saveDrive = async () => {
    setDriveMsg("");
    const res = await fetch(`/api/brands/${brand.id}/sources`, {
      method: driveUrl.trim() ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: driveUrl.trim() ? JSON.stringify({ url: driveUrl.trim() }) : undefined,
    });
    if (res.ok) {
      setDriveMsg(driveUrl.trim() ? "Klasör bağlandı" : "Klasör kaldırıldı");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setDriveMsg(d.error || "Kaydedilemedi");
    }
  };

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
        phone: phone.trim() || null,
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
            Telefon (WhatsApp)
            <input
              aria-label="Telefon"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            />
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
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <label className="text-[13px] text-[var(--text-dim)]">
            Google Drive klasör linki (opsiyonel)
            <input
              aria-label="Drive klasör linki"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            />
          </label>
          <p className="mt-1 text-[11.5px] text-[var(--text-mute)]">
            Klasör &ldquo;bağlantısı olan herkes&rdquo;e açık olmalı. Planlarda &ldquo;Drive&apos;dan çek&rdquo; ile içeri aktarılır.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={saveDrive} className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-dim)]">
              Klasörü kaydet
            </button>
            {driveMsg && <span className="text-[12px] text-[var(--text-mute)]">{driveMsg}</span>}
          </div>
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
