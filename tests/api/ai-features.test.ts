import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { GET as getPlan } from "@/app/api/plans/[id]/route";
import { POST as rewrite } from "@/app/api/plans/[id]/rewrite/route";
import { POST as analyzeFeed } from "@/app/api/plans/[id]/analyze-feed/route";
import { GET as listBrands } from "@/app/api/brands/route";
import { PATCH as patchBrand } from "@/app/api/brands/[id]/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function seededPlanWithItems() {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Eylül",
        rangeStart: "2026-08-28",
        rangeEnd: "2026-09-11",
        prompt: "2 günde bir post, her gün story, haftada 1 reels.",
      }),
    )
  ).json();
  await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }), ctx(plan.id));
  const full = await (await getPlan(j(`/api/plans/${plan.id}`, "GET"), ctx(plan.id))).json();
  return { plan, items: full.items as { id: string; type: string; caption: string | null }[] };
}

describe("rewrite caption", () => {
  it("replaces a post caption and rejects story", async () => {
    const { plan, items } = await seededPlanWithItems();
    const post = items.find((i) => i.type === "post")!;
    const story = items.find((i) => i.type === "story")!;

    const res = await rewrite(
      j(`/api/plans/${plan.id}/rewrite`, "POST", { itemId: post.id, instruction: "kısalt" }),
      ctx(plan.id),
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.caption).not.toBe(post.caption);

    const bad = await rewrite(
      j(`/api/plans/${plan.id}/rewrite`, "POST", { itemId: story.id }),
      ctx(plan.id),
    );
    expect(bad.status).toBe(400);
  });

  it("requires an editor actor", async () => {
    const { plan, items } = await seededPlanWithItems();
    const res = await rewrite(
      new Request(`http://t/api/plans/${plan.id}/rewrite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: items[0].id }),
      }),
      ctx(plan.id),
    );
    expect(res.status).toBe(403);
  });
});

describe("analyze feed", () => {
  it("asks for a screenshot when the brand has none", async () => {
    const { plan } = await seededPlanWithItems();
    const res = await analyzeFeed(j(`/api/plans/${plan.id}/analyze-feed`, "POST"), ctx(plan.id));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.needsScreenshot).toBe(true);
  });

  it("stores insights once a feed screenshot is set", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
    await patchBrand(
      j(`/api/brands/${brandId}`, "PATCH", { feedScreenshotUrl: "https://cdn/x/feed.jpg" }),
      { params: Promise.resolve({ id: brandId }) },
    );
    const { plan } = await seededPlanWithItems();

    const res = await analyzeFeed(j(`/api/plans/${plan.id}/analyze-feed`, "POST"), ctx(plan.id));
    expect(res.status).toBe(200);
    const { insights } = await res.json();
    expect(insights.length).toBeGreaterThanOrEqual(3);

    const full = await (await getPlan(j(`/api/plans/${plan.id}`, "GET"), ctx(plan.id))).json();
    expect(full.plan.feedInsights).toEqual(insights);
  });
});
