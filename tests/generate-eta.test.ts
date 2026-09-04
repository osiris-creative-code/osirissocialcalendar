import { describe, it, expect } from "vitest";
import { estimateGenerateMs } from "@/lib/generate-eta";

describe("estimateGenerateMs", () => {
  it("grows with item count", () => {
    const a = estimateGenerateMs(5, false);
    const b = estimateGenerateMs(20, false);
    expect(b).toBeGreaterThan(a);
  });

  it("vision estimates run higher than text-only for the same count", () => {
    expect(estimateGenerateMs(10, true)).toBeGreaterThan(estimateGenerateMs(10, false));
  });

  it("never goes negative or zero for 0 items", () => {
    expect(estimateGenerateMs(0, false)).toBeGreaterThan(0);
  });
});
