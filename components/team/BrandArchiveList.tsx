"use client";

import { useRouter } from "next/navigation";
import type { Brand } from "@/lib/types";

export function BrandArchiveList({ brands }: { brands: Brand[] }) {
  const router = useRouter();

  const toggle = async (b: Brand) => {
    await fetch(`/api/brands/${b.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: b.status === "active" ? "archived" : "active" }),
    });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      {brands.map((b) => (
        <div key={b.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5">
          <span className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.colorPrimary }} />
            {b.name}
            {b.status === "archived" && <span className="text-[11px] text-[var(--text-mute)]">arşivli</span>}
          </span>
          <button
            type="button"
            onClick={() => toggle(b)}
            className="rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[12px] font-semibold text-[var(--text-dim)]"
          >
            {b.status === "active" ? "Arşivle" : "Geri al"}
          </button>
        </div>
      ))}
    </div>
  );
}
