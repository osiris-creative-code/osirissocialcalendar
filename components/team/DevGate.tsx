"use client";

import { useState } from "react";

export function DevGate() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "developer", value: pw }),
    });
    if (res.ok) window.location.reload();
    else setError("Şifre hatalı.");
  };

  return (
    <form className="mx-auto flex max-w-[320px] flex-col gap-3" onSubmit={submit}>
      <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">Developer</h1>
      <label className="text-[13px] text-[var(--text-dim)]">
        Şifre
        <input
          aria-label="Developer şifresi"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
        />
      </label>
      <button type="submit" className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)]">
        Aç
      </button>
      {error && <p className="text-[12.5px] text-[var(--accent)]">{error}</p>}
    </form>
  );
}
