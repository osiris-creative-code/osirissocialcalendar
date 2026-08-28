"use client";

import { createRoot, type Root } from "react-dom/client";

type ToastAction = { label: string; onClick: () => void };

let root: Root | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function ensureRoot(): Root | null {
  if (typeof document === "undefined") return null;
  const host = document.getElementById("toast-root");
  if (!host) return null;
  if (!root) root = createRoot(host);
  return root;
}

function ToastCard({ message, action }: { message: string; action?: ToastAction }) {
  return (
    <div
      className="fixed left-1/2 bottom-6 z-70 flex -translate-x-1/2 items-center gap-3 rounded-[12px] px-4 py-3 text-[13px]"
      style={{ background: "var(--text)", color: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
    >
      <span>{message}</span>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-[7px] border border-white/40 px-2.5 py-1 text-[12px] font-semibold"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export const Toast = {
  show(message: string, opts: { action?: ToastAction; durationMs?: number } = {}) {
    const r = ensureRoot();
    if (!r) return;
    if (hideTimer) clearTimeout(hideTimer);
    r.render(<ToastCard message={message} action={opts.action} />);
    hideTimer = setTimeout(() => r.render(null), opts.durationMs ?? 5000);
  },
  hide() {
    const r = ensureRoot();
    if (r) r.render(null);
  },
};
