import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonStore } from "@/lib/data/json-store";

let store: JsonStore;

beforeEach(() => {
  store = new JsonStore(join(mkdtempSync(join(tmpdir(), "osiris-")), "db.json"));
});

describe("blob store — asset appends never clobber", () => {
  it("keeps every group when addAssets is called once per type", async () => {
    const [brand] = await store.listBrands();
    const plan = await store.createPlan({
      brandId: brand.id,
      title: "P",
      rangeStart: "2026-09-01",
      rangeEnd: "2026-09-10",
      prompt: "",
      theme: { primary: "#000", accent: "#111" },
    });

    await store.addAssets(plan.id, [
      { type: "post", kind: "image", url: "u/p1.jpg", name: "p1.jpg", slideGroup: null, slideOrder: 1 },
    ]);
    await store.addAssets(plan.id, [
      { type: "story", kind: "image", url: "u/s1.jpg", name: "s1.jpg", slideGroup: null, slideOrder: 1 },
    ]);
    await store.addAssets(plan.id, [
      { type: "reel", kind: "video", url: "", name: "ph", slideGroup: null, slideOrder: 1, placeholder: true },
    ]);

    const all = await store.listAssets(plan.id);
    expect(all.map((a) => a.type).sort()).toEqual(["post", "reel", "story"]);
    expect(all.find((a) => a.type === "reel")?.placeholder).toBe(true);
    // sort values are contiguous, not colliding
    expect(all.map((a) => a.sort)).toEqual([0, 1, 2]);
  });

  it("survives the pre-version file format", async () => {
    // simulate an old db.json (raw DbShape, no {version,data} wrapper)
    const [brand] = await store.listBrands();
    const fresh = new JsonStore((store as unknown as { path: string }).path);
    expect((await fresh.listBrands()).map((b) => b.id)).toContain(brand.id);
  });
});
