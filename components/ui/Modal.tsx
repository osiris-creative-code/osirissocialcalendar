"use client";

import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  size = "sm",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  /** "lg" is for content that has to be looked at, e.g. an annotated image. */
  size?: "sm" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 grid place-items-center p-5 backdrop-blur-[2px]"
      style={{ background: "rgba(20,14,10,.44)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`${
          size === "lg" ? "w-[min(560px,100%)] max-h-[88vh] overflow-y-auto p-4" : "w-[min(420px,100%)] p-6"
        } rounded-[var(--r-lg)] border border-[var(--border-strong)] bg-[var(--surface)]`}
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {children}
      </div>
    </div>
  );
}
