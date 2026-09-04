"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewPlanForm({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("Yeni takvim");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    // No date range here on purpose: you can't sensibly pick one before seeing
    // the shoot. The API defaults it, and the editor asks once content is in.
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brandId, title }),
    });
    setBusy(false);
    if (res.ok) {
      const plan = await res.json();
      router.push(`/app/plans/${plan.id}`);
    } else {
      setError("Plan oluşturulamadı.");
    }
  };

  return (
    <form className="mx-auto flex max-w-[520px] flex-col gap-4" onSubmit={submit}>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Yeni plan</h1>
        <p className="mt-1 text-[13px] text-[var(--text-mute)]">
          Sadece bir başlık ver. İçeriği yükleyeceğin, tarih aralığını seçeceğin ve “Plan öner”i
          kullanacağın ekran bir sonraki adımda — takvimi görselleri gördükten sonra kuracaksın.
        </p>
      </div>

      <label className="text-[13px] text-[var(--text-dim)]">
        Başlık
        <input
          aria-label="Başlık"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
        />
      </label>

      {error && <p className="text-[12.5px] text-[var(--accent)]">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-[10px] bg-[var(--brand)] px-5 py-2.5 text-[14px] font-semibold text-[var(--brand-ink)] disabled:opacity-60"
      >
        Oluştur
      </button>
    </form>
  );
}
