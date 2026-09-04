import type { ItemType } from "@/lib/types";

export type CadenceRule =
  | { type: ItemType; every: number; unit: "day"; weekdaysOnly: boolean }
  | { type: ItemType; onDates: string[] };

const MONTHS: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  agustos: 8,
  eylül: 9,
  eylul: 9,
  ekim: 10,
  kasım: 11,
  kasim: 11,
  aralık: 12,
  aralik: 12,
};

const TR_NUM: Record<string, number> = {
  bir: 1,
  iki: 2,
  üç: 3,
  uc: 3,
  dört: 4,
  dort: 4,
  beş: 5,
  bes: 5,
  altı: 6,
  alti: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
};

const MONTH_ALT = Object.keys(MONTHS).join("|");
const NUM_ALT = Object.keys(TR_NUM).join("|");

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function detectType(clause: string): ItemType | null {
  // `\b` is unreliable next to Turkish letters, so use plain substring patterns.
  // Order matters: "güne özel post" is a special, not a post.
  if (/özel|ozel/i.test(clause)) return "special";
  if (/reel/i.test(clause)) return "reel";
  if (/story|hikaye|hikâye/i.test(clause)) return "story";
  if (/post|gönderi|gonderi/i.test(clause)) return "post";
  return null;
}

function extractDates(clause: string, year: number): string[] {
  const re = new RegExp(`(\\d{1,2})\\s+(${MONTH_ALT})`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clause)) !== null) {
    const day = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    if (day >= 1 && day <= 31 && month) out.push(`${year}-${pad(month)}-${pad(day)}`);
  }
  return out;
}

function extractEvery(clause: string): number | null {
  if (/her\s+gün|her\s+gun|hergün/i.test(clause)) return 1;
  const nDays = new RegExp(`(\\d+|${NUM_ALT})\\s+günde\\s+bir`, "i").exec(clause);
  if (nDays) {
    const raw = nDays[1].toLowerCase();
    return /^\d+$/.test(raw) ? Number(raw) : (TR_NUM[raw] ?? null);
  }
  if (/haftada\s+(\d+|bir)/i.test(clause)) return 7;
  return null;
}

/**
 * Parse a free-text Turkish brief into cadence + specific-date rules.
 * Unparseable clauses are ignored, never thrown.
 */
export function parseCadence(prompt: string, rangeYear: number): CadenceRule[] {
  // Turkish drops the comma before "ve" in a plain list ("her gün story ve 5
  // günde bir reels") — splitting on punctuation alone left the last two
  // items fused into one clause. detectType() only returns its first match,
  // so "reel" won the whole fused clause and swallowed story's "her gün" as
  // its own cadence — a real prompt from the live "Plan öner" produced this
  // exact sentence and silently dropped every story from the calendar.
  const clauses = prompt
    .split(/[,.;\n]|\s+ve\s+/)
    .map((c) => c.trim())
    .filter(Boolean);
  const rules: CadenceRule[] = [];

  for (const clause of clauses) {
    const type = detectType(clause);
    if (!type) continue;

    const isSpecial = type === "special";
    const dates = extractDates(clause, rangeYear);
    const every = extractEvery(clause);
    const weekdaysOnly = /hafta\s+içi|hafta\s+ici/i.test(clause);

    if (isSpecial && dates.length) {
      rules.push({ type: "special", onDates: dates });
      continue;
    }

    if (every != null) {
      rules.push({ type, every, unit: "day", weekdaysOnly });
      continue;
    }

    if (dates.length) {
      rules.push({ type, onDates: dates });
    }
  }

  return dedupe(rules);
}

function dedupe(rules: CadenceRule[]): CadenceRule[] {
  const seen = new Set<string>();
  const out: CadenceRule[] = [];
  for (const r of rules) {
    const key = JSON.stringify(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
