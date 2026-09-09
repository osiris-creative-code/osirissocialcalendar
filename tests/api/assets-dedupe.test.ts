import { describe, it, expect } from "vitest";
import { getStore } from "@/lib/db";
import { POST as createPlan } from "@/app/api/plans/route";
import { GET as listAssets } from "@/app/api/plans/[id]/assets/route";
import { POST as dedupe } from "@/app/api/plans/[id]/assets/dedupe/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("assets/dedupe", () => {
  it("keeps one copy of each slideGroup+name and drops the rest", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
    const plan = await (
      await createPlan(
        j("/api/plans", "POST", {
          brandId,
          title: "Dedupe",
          rangeStart: "2026-09-01",
          rangeEnd: "2026-09-07",
          prompt: "her gun story",
        }),
      )
    ).json();

    const store = getStore();
    // 3 unique names, imported 3× over (a race) = 9 rows
    const mk = () =>
      ["s1.png", "s2.png", "s3.png"].map((name) => ({
        type: "story" as const,
        kind: "image" as const,
        url: `https://cdn.test/${name}`,
        name,
        slideGroup: null,
        slideOrder: 1,
      }));
    await store.addAssets(plan.id, mk());
    await store.addAssets(plan.id, mk());
    await store.addAssets(plan.id, mk());

    const before = await (await listAssets(j(`/api/plans/${plan.id}/assets`, "GET"), ctx(plan.id))).json();
    expect(before).toHaveLength(9);

    const res = await dedupe(j(`/api/plans/${plan.id}/assets/dedupe`, "POST"), ctx(plan.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ removed: 6, kept: 3 });

    const after = await (await listAssets(j(`/api/plans/${plan.id}/assets`, "GET"), ctx(plan.id))).json();
    expect(after.map((a: { name: string }) => a.name).sort()).toEqual(["s1.png", "s2.png", "s3.png"]);
  });

  it("is a no-op when there are no duplicates", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
    const plan = await (
      await createPlan(
        j("/api/plans", "POST", {
          brandId,
          title: "Dedupe clean",
          rangeStart: "2026-09-01",
          rangeEnd: "2026-09-07",
          prompt: "her gun story",
        }),
      )
    ).json();
    await getStore().addAssets(plan.id, [
      { type: "story", kind: "image", url: "https://cdn.test/only.png", name: "only.png", slideGroup: null, slideOrder: 1 },
    ]);

    const res = await dedupe(j(`/api/plans/${plan.id}/assets/dedupe`, "POST"), ctx(plan.id));
    expect(await res.json()).toEqual({ removed: 0, kept: 1 });
  });
});
