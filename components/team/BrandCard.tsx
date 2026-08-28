"use client";

import type { Brand } from "@/lib/types";

export function BrandCard({ brand, onOpen }: { brand: Brand; onOpen: (brandId: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(brand.id)}
      className="flex items-center gap-4 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] motion-reduce:transform-none"
      style={{ boxShadow: "var(--shadow)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brand.logoUrl}
        alt={brand.name}
        className="h-12 w-12 rounded-xl object-cover"
        style={{ background: brand.colorPrimary }}
      />
      <div>
        <div className="font-[family-name:var(--font-display)] text-[16px] font-semibold">{brand.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--text-mute)]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: brand.colorPrimary }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: brand.colorAccent }} />
          {brand.instagramHandle ? `@${brand.instagramHandle}` : "Instagram yok"}
        </div>
      </div>
    </button>
  );
}
