"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Caption box that keeps its own draft and only tells the plan about it on blur
 * (with an idle safety net). Propagating every keystroke re-rendered every item
 * in the plan, which is what made typing feel laggy.
 */
export function CaptionField({
  id,
  label,
  value,
  onCommit,
  className = "",
  rows = 2,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (id: string, caption: string) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt changes that came from elsewhere (e.g. "Yeniden yaz").
  useEffect(() => setDraft(value), [value]);
  useEffect(() => () => void (idle.current && clearTimeout(idle.current)), []);

  const flush = (text: string) => {
    if (idle.current) clearTimeout(idle.current);
    if (text !== value) onCommit(id, text);
  };

  return (
    <textarea
      aria-label={label}
      value={draft}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        if (idle.current) clearTimeout(idle.current);
        idle.current = setTimeout(() => flush(text), 1500);
      }}
      onBlur={() => flush(draft)}
      className={className}
    />
  );
}
