import { describe, it, expect } from "vitest";
import { newId, newToken } from "@/lib/ids";
import { zPlan } from "@/lib/types";

describe("ids + tokens", () => {
  it("newId is unique-ish and short", () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
    expect(a.length).toBe(12);
  });
  it("newToken carries its prefix", () => {
    expect(newToken("c").startsWith("c_")).toBe(true);
    expect(newToken("i").startsWith("i_")).toBe(true);
  });
});

describe("zPlan", () => {
  it("rejects an unknown stage", () => {
    const bad = {
      id: "x",
      brandId: "b",
      title: "t",
      rangeStart: "2026-08-28",
      rangeEnd: "2026-09-11",
      prompt: "",
      stage: "nope",
      theme: { primary: "#000", accent: "#111" },
      internalToken: "i_x",
      publicToken: null,
      version: 1,
      lastActorName: null,
      createdAt: "2026-08-28T00:00:00Z",
    };
    expect(zPlan.safeParse(bad).success).toBe(false);
  });

  it("accepts a well-formed plan", () => {
    const ok = {
      id: "x",
      brandId: "b",
      title: "Eylül",
      rangeStart: "2026-08-28",
      rangeEnd: "2026-09-11",
      prompt: "her gün story",
      stage: "taslak",
      theme: { primary: "#000", accent: "#111" },
      internalToken: "i_x",
      publicToken: null,
      version: 1,
      lastActorName: null,
      createdAt: "2026-08-28T00:00:00Z",
    };
    expect(zPlan.safeParse(ok).success).toBe(true);
  });
});
