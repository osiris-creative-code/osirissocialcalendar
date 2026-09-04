import { describe, it, expect } from "vitest";
import { calendarFacts, tooCloseTogether } from "@/lib/analyze/review";
import type { ItemType, PlanItem } from "@/lib/types";

function item(id: string, date: string, type: ItemType, caption: string | null = null): PlanItem {
  return {
    id,
    planId: "p",
    date,
    type,
    sort: 0,
    caption,
    specialLabel: null,
    media: [],
    isGap: false,
    hidden: false,
    publishedAt: null,
  };
}

describe("calendarFacts", () => {
  it("reports the type split", () => {
    const facts = calendarFacts(
      [item("a", "2026-03-01", "post"), item("b", "2026-03-01", "story")],
      "2026-03-01",
      "2026-03-01",
    );
    expect(facts[0]).toContain("1 post, 1 story");
  });

  it("flags days with nothing scheduled", () => {
    const facts = calendarFacts([item("a", "2026-03-01", "post")], "2026-03-01", "2026-03-04");
    expect(facts.join(" ")).toContain("3 gün tamamen boş");
  });

  it("flags a missing special day inside the range", () => {
    const facts = calendarFacts([item("a", "2026-03-07", "post")], "2026-03-07", "2026-03-09");
    expect(facts.join(" ")).toContain("Dünya Kadınlar Günü");
  });

  it("stays quiet about a special day that already has content", () => {
    const facts = calendarFacts(
      [{ ...item("a", "2026-03-08", "special"), specialLabel: "8 Mart" }],
      "2026-03-08",
      "2026-03-08",
    );
    expect(facts.join(" ")).not.toContain("bu güne özel içerik yok");
  });

  it("catches captions that are near-duplicates of each other", () => {
    const facts = calendarFacts(
      [
        item("a", "2026-03-01", "post", "Bugün tezgahta taze ürünler sizi bekliyor"),
        item("b", "2026-03-02", "post", "Bugün tezgahta taze ürünler sizi bekliyor #tekrar"),
      ],
      "2026-03-01",
      "2026-03-02",
    );
    expect(facts.join(" ")).toContain("benzeyen caption");
  });

  it("does not call two genuinely different captions a repeat", () => {
    const facts = calendarFacts(
      [
        item("a", "2026-03-01", "post", "Sabahın ilk kahvesi burada demlenir"),
        item("b", "2026-03-02", "post", "Hafta sonu için tatlı tezgahımız hazırlandı"),
      ],
      "2026-03-01",
      "2026-03-02",
    );
    expect(facts.join(" ")).not.toContain("benzeyen caption");
  });

  it("flags days carrying four or more items", () => {
    const day = "2026-03-01";
    const facts = calendarFacts(
      [
        item("a", day, "post"),
        item("b", day, "story"),
        item("c", day, "reel"),
        item("d", day, "special"),
      ],
      day,
      day,
    );
    expect(facts.join(" ")).toContain("4+ içerik");
  });
});

describe("tooCloseTogether", () => {
  it("reports look-alikes scheduled within two days of each other", () => {
    const items = [item("a", "2026-03-01", "post"), item("b", "2026-03-02", "post")];
    expect(tooCloseTogether(items, [["a", "b"]])[0]).toContain("1 gün arayla");
  });

  it("says nothing when they are already spread out", () => {
    const items = [item("a", "2026-03-01", "post"), item("b", "2026-03-09", "post")];
    expect(tooCloseTogether(items, [["a", "b"]])).toEqual([]);
  });
});
