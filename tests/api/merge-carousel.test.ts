import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as addAssets } from "@/app/api/plans/[id]/assets/route";
import { POST as mergeCarousel } from "@/app/api/plans/[id]/merge-carousel/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function seedPlan(items: { type: "post" | "story" | "reel"; kind: "image" | "video"; name: string }[]) {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(
      j("/api/plans", "POST", { brandId, title: "Merge", rangeStart: "2026-09-01", rangeEnd: "2026-09-07", prompt: "" }),
    )
  ).json();
  const withUrls = items.map((it, i) => ({ url: `https://cdn.test/${it.name}-${i}`, ...it }));
  const added = await (await addAssets(j(`/api/plans/${plan.id}/assets`, "POST", { items: withUrls }), ctx(plan.id))).json();
  return { planId: plan.id as string, assets: added as { id: string }[] };
}

describe("merge-carousel — manual selection", () => {
  it("groups the chosen posts with sequential slideOrder", async () => {
    const { planId, assets } = await seedPlan([
      { type: "post", kind: "image", name: "a.jpg" },
      { type: "post", kind: "image", name: "b.jpg" },
      { type: "post", kind: "image", name: "c.jpg" },
    ]);

    const res = await mergeCarousel(
      j(`/api/plans/${planId}/merge-carousel`, "POST", { assetIds: [assets[0].id, assets[1].id] }),
      ctx(planId),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const grouped = data.assets.filter((a: { slideGroup: string | null }) => a.slideGroup);
    expect(grouped).toHaveLength(2);
    expect(grouped.map((a: { slideOrder: number }) => a.slideOrder).sort()).toEqual([1, 2]);
  });

  it("refuses to merge fewer than two assets", async () => {
    const { planId, assets } = await seedPlan([{ type: "post", kind: "image", name: "a.jpg" }]);
    const res = await mergeCarousel(
      j(`/api/plans/${planId}/merge-carousel`, "POST", { assetIds: [assets[0].id] }),
      ctx(planId),
    );
    expect(res.status).toBe(400);
  });

  it("refuses a story — Instagram has no carousel for stories", async () => {
    const { planId, assets } = await seedPlan([
      { type: "story", kind: "image", name: "s1.jpg" },
      { type: "story", kind: "image", name: "s2.jpg" },
    ]);
    const res = await mergeCarousel(
      j(`/api/plans/${planId}/merge-carousel`, "POST", { assetIds: [assets[0].id, assets[1].id] }),
      ctx(planId),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("post");
  });

  it("refuses a mix of a post and a reel", async () => {
    const { planId, assets } = await seedPlan([
      { type: "post", kind: "image", name: "p1.jpg" },
      { type: "reel", kind: "video", name: "r1.mp4" },
    ]);
    const res = await mergeCarousel(
      j(`/api/plans/${planId}/merge-carousel`, "POST", { assetIds: [assets[0].id, assets[1].id] }),
      ctx(planId),
    );
    expect(res.status).toBe(400);
  });
});
