import type { Stage } from "@/lib/types";

export const STAGE_LABELS: Record<Stage, string> = {
  taslak: "Taslak",
  ic_onayda: "İç onayda",
  markaya_hazir: "Markaya hazır",
  markada: "Markada",
  revize_istendi: "Revize istendi",
  onaylandi: "Onaylandı",
  yayinda: "Yayında",
  tamamlandi: "Tamamlandı",
};

export const STAGE_ORDER: Stage[] = [
  "taslak",
  "ic_onayda",
  "markaya_hazir",
  "markada",
  "revize_istendi",
  "onaylandi",
  "yayinda",
  "tamamlandi",
];

const TRANSITIONS: Record<Stage, Stage[]> = {
  taslak: ["ic_onayda"],
  ic_onayda: ["markaya_hazir", "taslak"],
  markaya_hazir: ["markada"],
  markada: ["revize_istendi", "onaylandi"],
  revize_istendi: ["markada"],
  onaylandi: ["yayinda"],
  yayinda: ["onaylandi", "tamamlandi"],
  tamamlandi: [],
};

export function canTransition(from: Stage, to: Stage): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** A fresh public share token is minted only on the first push to the brand. */
export function mintsPublicToken(from: Stage, to: Stage): boolean {
  return from === "markaya_hazir" && to === "markada";
}
