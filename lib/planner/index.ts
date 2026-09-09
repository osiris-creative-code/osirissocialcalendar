import { parseCadence, type CadenceRule } from "./cadence";
import { assignAssets, buildSlots, topUpSlots, type DraftItem, type PlannerAsset } from "./distribute";

export type { CadenceRule } from "./cadence";
export type { PlannerAsset, DraftItem, Slot } from "./distribute";
export { parseCadence } from "./cadence";
export { buildSlots, assignAssets, topUpSlots } from "./distribute";

export type PlannerResult = {
  rules: CadenceRule[];
  extend: DraftItem[];
  stopAtAssets: DraftItem[];
  gap: boolean;
};

export function planFromPrompt(
  prompt: string,
  rangeStart: string,
  rangeEnd: string,
  assets: PlannerAsset[],
): PlannerResult {
  const rangeYear = Number(rangeStart.slice(0, 4));
  const rules = parseCadence(prompt, rangeYear);
  const cadenceSlots = buildSlots(rules, rangeStart, rangeEnd);
  // Make room for content the cadence didn't leave a slot for, so regenerating
  // after an upload actually places the new images.
  const slots = topUpSlots(cadenceSlots, assets, rangeStart, rangeEnd);
  const { extend, stopAtAssets, gap } = assignAssets(slots, assets);
  return { rules, extend, stopAtAssets, gap };
}
