import { describe, it, expect } from "vitest";
import { canTransition, mintsPublicToken } from "@/lib/plan-stages";

describe("canTransition", () => {
  it("allows the happy path", () => {
    expect(canTransition("taslak", "ic_onayda")).toBe(true);
    expect(canTransition("ic_onayda", "markaya_hazir")).toBe(true);
    expect(canTransition("markaya_hazir", "markada")).toBe(true);
    expect(canTransition("markada", "revize_istendi")).toBe(true);
    expect(canTransition("revize_istendi", "markada")).toBe(true);
    expect(canTransition("markada", "onaylandi")).toBe(true);
  });
  it("allows send-back", () => {
    expect(canTransition("ic_onayda", "taslak")).toBe(true);
  });
  it("rejects skips", () => {
    expect(canTransition("taslak", "markada")).toBe(false);
    expect(canTransition("onaylandi", "taslak")).toBe(false);
    expect(canTransition("markaya_hazir", "taslak")).toBe(false);
  });
});

describe("mintsPublicToken", () => {
  it("only when markaya_hazir -> markada", () => {
    expect(mintsPublicToken("markaya_hazir", "markada")).toBe(true);
    expect(mintsPublicToken("revize_istendi", "markada")).toBe(false);
  });
});
