import { describe, it, expect } from "vitest";
import { PALETTE_KEYS } from "@/lib/theme";

describe("scaffold", () => {
  it("exposes the documented palette keys", () => {
    expect(PALETTE_KEYS).toContain("--brand");
    expect(PALETTE_KEYS).toContain("--accent");
    expect(PALETTE_KEYS.length).toBeGreaterThanOrEqual(12);
  });
});
