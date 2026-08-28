"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Brand } from "@/lib/types";
import { BrandCard } from "./BrandCard";
import { NewBrandModal } from "./NewBrandModal";

export function BrandsGrid({ brands, canAdd }: { brands: Brand[]; canAdd: boolean }) {
  const router = useRouter();
  const [modal, setModal] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Markalar</h1>
        {canAdd && (
          <button
            type="button"
            onClick={() => setModal(true)}
            className="rounded-[10px] bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)]"
          >
            ＋ Marka ekle
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <BrandCard key={b.id} brand={b} onOpen={(id) => router.push(`/app/brands/${id}`)} />
        ))}
        {brands.length === 0 && (
          <p className="text-[14px] text-[var(--text-mute)]">Henüz marka yok.</p>
        )}
      </div>

      <NewBrandModal open={modal} onClose={() => setModal(false)} onCreated={() => router.refresh()} />
    </>
  );
}
