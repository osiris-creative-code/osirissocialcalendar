"use client";

import Link from "next/link";
import { ROLE_LABELS } from "@/lib/access/roles";
import type { Role } from "@/lib/types";

function toggleTheme() {
  const root = document.documentElement;
  const current =
    root.getAttribute("data-theme") ??
    (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("ritim-theme", next);
  } catch {
    /* ignore */
  }
}

export function TopBar({
  actor,
  isDeveloper,
  activeBrand,
}: {
  actor: { name: string; role: Role };
  isDeveloper: boolean;
  activeBrand?: { name: string; colorPrimary: string } | null;
}) {
  const showDeveloper = isDeveloper || actor.role === "developer";

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-4 border-b border-[var(--border)] bg-[var(--bg)]/85 px-5 py-3 backdrop-blur">
      <Link href="/app/brands" className="font-[family-name:var(--font-display)] text-xl font-semibold">
        Osiris
      </Link>

      <nav className="flex items-center gap-1 text-[13px]">
        <Link href="/app/brands" className="rounded-lg px-3 py-1.5 text-[var(--text-dim)] hover:bg-[var(--surface-2)]">
          Markalar
        </Link>
        <Link href="/app/queue" className="rounded-lg px-3 py-1.5 text-[var(--text-dim)] hover:bg-[var(--surface-2)]">
          Onay kuyruğu
        </Link>
        {showDeveloper && (
          <Link href="/app/developer" className="rounded-lg px-3 py-1.5 text-[var(--text-dim)] hover:bg-[var(--surface-2)]">
            Developer
          </Link>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-3 text-[12.5px] text-[var(--text-dim)]">
        {activeBrand && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: activeBrand.colorPrimary }} />
            {activeBrand.name}
          </span>
        )}
        <span>
          {actor.name} · {ROLE_LABELS[actor.role]}
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Tema değiştir"
          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)]"
        >
          ◐
        </button>
      </div>
    </header>
  );
}
