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

/**
 * Cadence slots are built from the prompt + range alone, so a type can end up
 * with more uploaded asset units than there are slots to hold them (someone
 * uploads 15 posts for a range the prompt only spaces 10 into). Left as-is,
 * "Yeniden üret" silently drops the extras. This tops the range up with extra
 * evenly-spaced slots of that type until the units run out or every day in the
 * range already has one — so regenerating actually uses newly added content.
 */
export function topUpSlots(
  slots: Slot[],
  assets: PlannerAsset[],
  rangeStart: string,
  rangeEnd: string,
): Slot[] {
  const queues = buildUnitQueues(assets);
  const days: string[] = [];
  for (let ms = toUtc(rangeStart); ms <= toUtc(rangeEnd); ms += DAY_MS) days.push(fromUtc(ms));
  if (days.length === 0) return slots;

  // `special` slots draw from the post pool, so they count against post capacity.
  const used: Record<ItemType, number> = { post: 0, story: 0, reel: 0, special: 0 };
  for (const s of slots) used[s.type === "special" ? "post" : s.type] += 1;

  const out = [...slots];
  for (const type of ["post", "story", "reel"] as const) {
    let need = queues[type].length - used[type];
    if (need <= 0) continue;
    const taken = new Set(out.filter((s) => s.type === type).map((s) => s.date));
    const step = days.length / (need + 1);
    const spaced = Array.from({ length: need }, (_, k) => days[Math.min(days.length - 1, Math.round((k + 1) * step))]);
    for (const date of [...spaced, ...days]) {
      if (need === 0) break;
      if (taken.has(date)) continue;
      taken.add(date);
      out.push({ date, type });
      need -= 1;
    }
  }

  out.sort((a, b) =>
    a.date === b.date
      ? TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
      : a.date < b.date
        ? -1
        : 1,
  );
  return out;
}

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
