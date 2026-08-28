import { describe, it, expect } from "vitest";
import { parseCadence } from "@/lib/planner/cadence";

const P =
  "01–12 Eylül arası: 2 günde bir post, her gün story, haftada 1 reels. 7 Eylül Dünya Çikolata Günü'ne özel post.";

describe("parseCadence", () => {
  const rules = parseCadence(P, 2026);

  it("finds the post cadence", () => {
    expect(rules).toContainEqual({ type: "post", every: 2, unit: "day", weekdaysOnly: false });
  });
  it("finds daily story", () => {
    expect(rules).toContainEqual({ type: "story", every: 1, unit: "day", weekdaysOnly: false });
  });
  it("finds weekly reel", () => {
    expect(rules).toContainEqual({ type: "reel", every: 7, unit: "day", weekdaysOnly: false });
  });
  it("finds the special day", () => {
    expect(rules).toContainEqual({ type: "special", onDates: ["2026-09-07"] });
  });
  it("ignores gibberish without throwing", () => {
    expect(parseCadence("lorem ipsum dolor", 2026)).toEqual([]);
  });
  it("handles 'hafta içi'", () => {
    const r = parseCadence("hafta içi 2 günde bir post", 2026);
    expect(r[0]).toMatchObject({ type: "post", weekdaysOnly: true });
  });
  it("handles Turkish number words", () => {
    const r = parseCadence("iki günde bir post", 2026);
    expect(r[0]).toMatchObject({ type: "post", every: 2 });
  });
});
