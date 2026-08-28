import type { ItemType } from "@/lib/types";
import type { CadenceRule } from "./cadence";

/** Minimal asset shape the planner needs; `lib/sources` Asset structurally satisfies it. */
export type PlannerAsset = {
  id: string;
  type: ItemType;
  slideGroup?: string;
  slideOrder: number;
};

export type Slot = { date: string; type: ItemType; specialLabel?: string };

export type DraftItem = {
  date: string;
  type: ItemType;
  assetIds: string[];
  isGap: boolean;
  specialLabel: string | null;
};

const TYPE_ORDER: ItemType[] = ["post", "story", "reel", "special"];
const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}
function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
function isWeekend(ms: number): boolean {
  const d = new Date(ms).getUTCDay();
  return d === 0 || d === 6;
}

export function buildSlots(rules: CadenceRule[], rangeStart: string, rangeEnd: string): Slot[] {
  const start = toUtc(rangeStart);
  const end = toUtc(rangeEnd);
  const slots: Slot[] = [];

  for (const rule of rules) {
    if ("onDates" in rule) {
      for (const date of rule.onDates) {
        const ms = toUtc(date);
        if (ms < start || ms > end) continue;
        slots.push(
          rule.type === "special"
            ? { date, type: "special", specialLabel: undefined }
            : { date, type: rule.type },
        );
      }
      continue;
    }
    const step = Math.max(1, rule.every) * DAY_MS;
    for (let ms = start; ms <= end; ms += step) {
      if (rule.weekdaysOnly && isWeekend(ms)) continue;
      slots.push({ date: fromUtc(ms), type: rule.type });
    }
  }

  const seen = new Set<string>();
  const deduped = slots.filter((s) => {
    const key = `${s.date}|${s.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) =>
    a.date === b.date
      ? TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
      : a.date < b.date
        ? -1
        : 1,
  );
  return deduped;
}

type Unit = string[]; // ordered asset ids that fill one slot

function buildUnitQueues(assets: PlannerAsset[]): Record<ItemType, Unit[]> {
  const queues: Record<ItemType, Unit[]> = { post: [], story: [], reel: [], special: [] };
  const byType: Record<ItemType, PlannerAsset[]> = { post: [], story: [], reel: [], special: [] };
  for (const a of assets) byType[a.type].push(a);

  for (const type of TYPE_ORDER) {
    const list = byType[type];
    const usedGroups = new Set<string>();
    for (const a of list) {
      if (a.slideGroup) {
        if (usedGroups.has(a.slideGroup)) continue;
        usedGroups.add(a.slideGroup);
        const unit = list
          .filter((x) => x.slideGroup === a.slideGroup)
          .sort((x, y) => x.slideOrder - y.slideOrder)
          .map((x) => x.id);
        queues[type].push(unit);
      } else {
        queues[type].push([a.id]);
      }
    }
  }
  return queues;
}

export function assignAssets(
  slots: Slot[],
  assets: PlannerAsset[],
): { extend: DraftItem[]; stopAtAssets: DraftItem[]; gap: boolean } {
  const queues = buildUnitQueues(assets);
  const cursor: Record<ItemType, number> = { post: 0, story: 0, reel: 0, special: 0 };

  const extend: DraftItem[] = slots.map((slot) => {
    // `special` draws from the post asset pool.
    const pool: ItemType = slot.type === "special" ? "post" : slot.type;
    const unit = queues[pool][cursor[pool]];
    const specialLabel = slot.type === "special" ? (slot.specialLabel ?? null) : null;
    if (!unit) {
      return { date: slot.date, type: slot.type, assetIds: [], isGap: true, specialLabel };
    }
    cursor[pool] += 1;
    return { date: slot.date, type: slot.type, assetIds: unit, isGap: false, specialLabel };
  });

  const stopAtAssets = extend.filter((i) => !i.isGap);
  const gap = extend.some((i) => i.isGap);
  return { extend, stopAtAssets, gap };
}
