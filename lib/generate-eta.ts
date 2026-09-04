/**
 * Estimated wall-clock time for the single captions AI call generate() makes,
 * used to drive a real (calibrated) progress bar instead of an indeterminate one.
 * Vision (image-grounded captions) roughly doubles per-item latency.
 */
export function estimateGenerateMs(itemCount: number, vision: boolean): number {
  const base = vision ? 4000 : 2500;
  const perItem = vision ? 900 : 350;
  return base + perItem * Math.max(0, itemCount);
}
