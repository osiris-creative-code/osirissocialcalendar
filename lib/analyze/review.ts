import type { PlanItem } from "@/lib/types";

/** Fixed-date Turkish days worth a dedicated post. Moving religious holidays are
 *  deliberately left out — their dates shift yearly and guessing them is worse
 *  than staying quiet. MM-DD keys. */
const SPECIAL_DAYS: Record<string, string> = {
  "01-01": "Yılbaşı",
  "02-14": "Sevgililer Günü",
  "03-08": "Dünya Kadınlar Günü",
  "04-23": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
  "05-01": "1 Mayıs Emek ve Dayanışma Günü",
  "05-19": "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  "07-15": "15 Temmuz Demokrasi ve Millî Birlik Günü",
  "08-30": "30 Ağustos Zafer Bayramı",
  "10-29": "29 Ekim Cumhuriyet Bayramı",
  "11-10": "10 Kasım Atatürk'ü Anma Günü",
  "11-24": "24 Kasım Öğretmenler Günü",
  "12-31": "Yılbaşı arifesi",
};

const DAY_MS = 86400000;

function days(rangeStart: string, rangeEnd: string): string[] {
  const out: string[] = [];
  const end = new Date(`${rangeEnd}T00:00:00Z`).getTime();
  for (let t = new Date(`${rangeStart}T00:00:00Z`).getTime(); t <= end; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** Words worth comparing — drops hashtags, emoji-ish punctuation and stopwords. */
function words(caption: string): string[] {
  return caption
    .toLocaleLowerCase("tr")
    .replace(/#\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function bigrams(caption: string): Set<string> {
  const w = words(caption);
  const out = new Set<string>();
  for (let i = 0; i + 1 < w.length; i++) out.add(`${w[i]} ${w[i + 1]}`);
  return out;
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const g of a) if (b.has(g)) hits++;
  return hits / Math.min(a.size, b.size);
}

/**
 * Everything about a generated calendar that can be checked with arithmetic —
 * no model call. The result is fed to the AI as facts so it only has to
 * prioritise and phrase, never to count.
 */
export function calendarFacts(
  items: PlanItem[],
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const facts: string[] = [];
  const visible = items.filter((i) => !i.hidden);

  // Type balance
  const counts = { post: 0, story: 0, reel: 0, special: 0 };
  for (const i of visible) counts[i.type]++;
  facts.push(
    `İçerik dağılımı: ${counts.post} post, ${counts.story} story, ${counts.reel} reels, ${counts.special} güne özel.`,
  );
  if (counts.reel === 0) facts.push("Aralıkta hiç reels yok.");
  if (counts.story === 0) facts.push("Aralıkta hiç story yok.");

  // Empty days
  const scheduled = new Set(visible.map((i) => i.date));
  const all = days(rangeStart, rangeEnd);
  const empty = all.filter((d) => !scheduled.has(d));
  if (empty.length > 0) {
    facts.push(`${empty.length} gün tamamen boş: ${empty.slice(0, 8).join(", ")}.`);
  }

  // Crowded days
  const perDay = new Map<string, number>();
  for (const i of visible) perDay.set(i.date, (perDay.get(i.date) ?? 0) + 1);
  const crowded = [...perDay.entries()].filter(([, n]) => n >= 4).map(([d]) => d);
  if (crowded.length) facts.push(`Aynı güne 4+ içerik düşen günler: ${crowded.join(", ")}.`);

  // Repeated captions
  const withCaption = visible.filter((i) => i.caption && i.caption.trim().length > 0);
  const grams = withCaption.map((i) => ({ item: i, g: bigrams(i.caption!) }));
  const repeats: string[] = [];
  for (let a = 0; a < grams.length; a++) {
    for (let b = a + 1; b < grams.length; b++) {
      if (overlap(grams[a].g, grams[b].g) >= 0.5) {
        repeats.push(`${grams[a].item.date} ↔ ${grams[b].item.date}`);
      }
    }
  }
  if (repeats.length) {
    facts.push(`Birbirine çok benzeyen caption çiftleri: ${repeats.slice(0, 6).join("; ")}.`);
  }

  // Special days with no dedicated content
  for (const d of all) {
    const label = SPECIAL_DAYS[d.slice(5)];
    if (!label) continue;
    const has = visible.some((i) => i.date === d && (i.type === "special" || i.specialLabel));
    if (!has) facts.push(`${d} ${label} — bu güne özel içerik yok.`);
  }

  return facts;
}

/** Same-day-or-adjacent scheduling of items flagged as look-alikes. */
export function tooCloseTogether(items: PlanItem[], groups: string[][]): string[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: string[] = [];
  for (const group of groups) {
    const dates = group
      .map((id) => byId.get(id)?.date)
      .filter((d): d is string => !!d)
      .sort();
    for (let i = 0; i + 1 < dates.length; i++) {
      const gap =
        (new Date(`${dates[i + 1]}T00:00:00Z`).getTime() -
          new Date(`${dates[i]}T00:00:00Z`).getTime()) /
        DAY_MS;
      if (gap <= 2) out.push(`${dates[i]} ↔ ${dates[i + 1]} (${gap} gün arayla)`);
    }
  }
  return out;
}
