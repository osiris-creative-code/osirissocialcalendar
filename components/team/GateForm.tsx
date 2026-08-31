"use client";

import { useState } from "react";
import type { Role } from "@/lib/types";

export function GateForm({ step }: { step: "team" | "role" }) {
  const [teamCode, setTeamCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("yonetici");
  const [devPassword, setDevPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "team", value: teamCode }),
    });
    setBusy(false);
    if (res.ok) window.location.reload();
    else setError("Ekip kodu hatalı.");
  };

  const submitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (role === "developer") {
      const dev = await fetch("/api/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "developer", value: devPassword }),
      });
      if (!dev.ok) {
        setBusy(false);
        setError("Developer şifresi hatalı.");
        return;
      }
    }
    const res = await fetch("/api/role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, role }),
    });
    setBusy(false);
    if (res.ok) window.location.reload();
    else setError("Giriş yapılamadı.");
  };

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-[min(360px,100%)] rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6" style={{ boxShadow: "var(--shadow)" }}>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold">Osiris Social Calendar</h1>

        {step === "team" ? (
          <form className="mt-4 flex flex-col gap-3" onSubmit={submitTeam}>
            <label className="text-[13px] text-[var(--text-dim)]">
              Ekip kodu
              <input
                aria-label="Ekip kodu"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
              />
            </label>
            <button type="submit" disabled={busy} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)] disabled:opacity-60">
              Devam
            </button>
          </form>
        ) : (
          <form className="mt-4 flex flex-col gap-3" onSubmit={submitRole}>
            <label className="text-[13px] text-[var(--text-dim)]">
              Adınız
              <input
                aria-label="Adınız"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
              />
            </label>
            <label className="text-[13px] text-[var(--text-dim)]">
              Rol
              <select
                aria-label="Rol"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
              >
                <option value="yonetici">Yönetici</option>
                <option value="onaylayan">In-house onaylayan</option>
                <option value="developer">Developer</option>
              </select>
            </label>
            {role === "developer" && (
              <label className="text-[13px] text-[var(--text-dim)]">
                Developer şifresi
                <input
                  aria-label="Developer şifresi"
                  type="password"
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
                />
              </label>
            )}
            <button type="submit" disabled={busy} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--brand-ink)] disabled:opacity-60">
              Gir
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-[12.5px] text-[var(--accent)]">{error}</p>}
      </div>
    </main>
  );
}
