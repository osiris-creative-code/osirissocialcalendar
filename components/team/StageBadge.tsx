import { STAGE_LABELS } from "@/lib/plan-stages";
import type { Stage } from "@/lib/types";

const CLASS: Record<Stage, string> = {
  taslak: "bg-[var(--surface-2)] text-[var(--text-dim)]",
  ic_onayda: "bg-[var(--warn-soft)] text-[var(--warn)]",
  markaya_hazir: "bg-[var(--brand-soft)] text-[var(--brand)]",
  markada: "bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] text-[var(--warn)]",
  revize_istendi: "bg-[var(--accent-soft)] text-[var(--accent)]",
  onaylandi: "bg-[var(--ok-soft)] text-[var(--ok)]",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${CLASS[stage]}`}>
      {stage === "onaylandi" ? "✓ " : ""}
      {STAGE_LABELS[stage]}
    </span>
  );
}
