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

  // A real "Plan öner" response used this exact phrasing — no comma before
  // "ve", which is normal Turkish list style — and it silently produced zero
  // story items: detectType() only returns its first match, so the fused
  // "her gün story ve 5 günde bir reels" clause was read as one daily-reel
  // rule and the story cadence disappeared entirely.
  it("splits a comma-less 'X ve Y' cadence into two separate rules", () => {
    const r = parseCadence("her gün story ve 5 günde bir reels paylaşım temposunu koruyalım", 2026);
    expect(r).toContainEqual({ type: "story", every: 1, unit: "day", weekdaysOnly: false });
    expect(r).toContainEqual({ type: "reel", every: 5, unit: "day", weekdaysOnly: false });
  });

  it("still finds all three cadences in the exact prompt that triggered the bug", () => {
    const real =
      "Rafine Coffee markası için 2026-09-04 – 2026-09-30 tarihleri arasında bir sosyal medya " +
      "paylaşım planı önerisinde bulunuyorum. Toplamda 10 post, 15 story ve 3 reels içerik mevcut. " +
      "Bu içeriklerin paylaşımlarını planlarken 2 günde bir post, her gün story ve 5 günde bir reels " +
      "paylaşım temposunu koruyalım. Postlarda sıcak, samimi bir dil kullanarak hafif emoji eklenmeli; " +
      "storylerde ise açıklama yazılmamalı.";
    const r = parseCadence(real, 2026);
    expect(r).toContainEqual({ type: "post", every: 2, unit: "day", weekdaysOnly: false });
    expect(r).toContainEqual({ type: "story", every: 1, unit: "day", weekdaysOnly: false });
    expect(r).toContainEqual({ type: "reel", every: 5, unit: "day", weekdaysOnly: false });
  });

  it("does not mistake 'evet'/'veya' for the 've' conjunction", () => {
    // "\s+ve\s+" only matches "ve" as its own word — "evet" and "veya" must
    // stay intact, or this would over-split unrelated text.
    const r = parseCadence("her gün story, evet öyle, 3 günde bir post, veya böyle olsun, haftada 1 reels", 2026);
    expect(r).toContainEqual({ type: "story", every: 1, unit: "day", weekdaysOnly: false });
    expect(r).toContainEqual({ type: "post", every: 3, unit: "day", weekdaysOnly: false });
    expect(r).toContainEqual({ type: "reel", every: 7, unit: "day", weekdaysOnly: false });
  });
});
