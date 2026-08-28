import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonStore } from "@/lib/data/json-store";

let store: JsonStore;
let dbPath: string;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "ritim-"));
  dbPath = join(dir, "db.json");
  store = new JsonStore(dbPath);
});

describe("JsonStore", () => {
  it("seeds two active brands", async () => {
    const brands = await store.listBrands();
    expect(brands.map((b) => b.name).sort()).toEqual(["Elit Bakery", "Pablo"]);
  });

  it("creates a plan and reads it back by internal token", async () => {
    const [brand] = await store.listBrands();
    const plan = await store.createPlan({
      brandId: brand.id,
      title: "Eylül",
      rangeStart: "2026-08-28",
      rangeEnd: "2026-09-11",
      prompt: "her gün story",
      theme: { primary: brand.colorPrimary, accent: brand.colorAccent },
    });
    expect(plan.stage).toBe("taslak");
    expect(plan.publicToken).toBeNull();
    expect(plan.internalToken).toMatch(/^i_/);

    const back = await store.getPlanByToken("internal", plan.internalToken);
    expect(back?.id).toBe(plan.id);
  });

  it("replaceItems swaps the whole set and sorts by sort", async () => {
    const [brand] = await store.listBrands();
    const plan = await store.createPlan({
      brandId: brand.id,
      title: "P",
      rangeStart: "2026-09-01",
      rangeEnd: "2026-09-02",
      prompt: "",
      theme: { primary: "#000", accent: "#111" },
    });
    await store.replaceItems(plan.id, [
      { date: "2026-09-02", type: "story", sort: 1, caption: null, specialLabel: null, media: [], isGap: false, hidden: false },
      { date: "2026-09-01", type: "post", sort: 0, caption: "A", specialLabel: null, media: [], isGap: false, hidden: false },
    ]);
    const items = await store.listItems(plan.id);
    expect(items.map((i) => i.type)).toEqual(["post", "story"]);
  });

  it("persists across instances", async () => {
    const [brand] = await store.listBrands();
    await store.createPlan({
      brandId: brand.id,
      title: "P",
      rangeStart: "2026-09-01",
      rangeEnd: "2026-09-02",
      prompt: "",
      theme: { primary: "#000", accent: "#111" },
    });
    const reopened = new JsonStore(dbPath);
    expect(await reopened.listPlans()).toHaveLength(1);
  });

  it("logs and lists activity newest-first", async () => {
    const [brand] = await store.listBrands();
    const plan = await store.createPlan({
      brandId: brand.id, title: "P", rangeStart: "2026-09-01", rangeEnd: "2026-09-02",
      prompt: "", theme: { primary: "#000", accent: "#111" },
    });
    await store.logActivity({ planId: plan.id, actorName: "Derya", actorRole: "yonetici", action: "created", meta: {} });
    await store.logActivity({ planId: plan.id, actorName: "Derya", actorRole: "yonetici", action: "generated", meta: {} });
    const log = await store.listActivity(plan.id);
    expect(log).toHaveLength(2);
    expect(log[0].action).toBe("generated");
  });
});
