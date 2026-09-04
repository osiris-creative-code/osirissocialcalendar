import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as addAssets, GET as listAssets } from "@/app/api/plans/[id]/assets/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { POST as attachAsset } from "@/app/api/plans/[id]/items/[itemId]/attach-asset/route";
import { POST as setStage } from "@/app/api/plans/[id]/stage/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const itemCtx = (id: string, itemId: string) => ({ params: Promise.resolve({ id, itemId }) });
const planCtx = (id: string) => ({ params: Promise.resolve({ id }) });

async function seedGeneratedPlan() {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Attach",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-01",
        prompt: "her gun post",
      }),
    )
  ).json();
  await addAssets(
    j(`/api/plans/${plan.id}/assets`, "POST", {
      items: [{ type: "post", kind: "image", url: "https://cdn.test/original.jpg", name: "original.jpg" }],
    }),
    planCtx(plan.id),
  );
  const genRes = await generate(
    j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }),
    planCtx(plan.id),
  );
  const data = await genRes.json();
  return { planId: plan.id as string, items: data.items as { id: string; type: string }[] };
}

async function addAsset(planId: string, item: { type: string; kind: string; url: string; name: string }) {
  await addAssets(j(`/api/plans/${planId}/assets`, "POST", { items: [item] }), planCtx(planId));
  const assets = (await (await listAssets(j(`/api/plans/${planId}/assets`, "GET"), planCtx(planId))).json()) as {
    id: string;
    url: string;
  }[];
  return assets.find((a) => a.url === item.url)!;
}

describe("attach-asset", () => {
  it("replaces the item's media with the chosen asset", async () => {
    const { planId, items } = await seedGeneratedPlan();
    const target = items.find((i) => i.type === "post")!;
    const replacement = await addAsset(planId, {
      type: "post",
      kind: "image",
      url: "https://cdn.test/replacement.jpg",
      name: "new.jpg",
    });

    const res = await attachAsset(
      j(`/api/plans/${planId}/items/${target.id}/attach-asset`, "POST", { assetId: replacement.id }),
      itemCtx(planId, target.id),
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.media).toEqual([
      { url: "https://cdn.test/replacement.jpg", kind: "image", slideOrder: 1 },
    ]);
    expect(updated.isGap).toBe(false);
  });

  it("works after the plan has moved past taslak — the whole point of this endpoint", async () => {
    const { planId, items } = await seedGeneratedPlan();
    const target = items.find((i) => i.type === "post")!;
    const replacement = await addAsset(planId, {
      type: "post",
      kind: "image",
      url: "https://cdn.test/late-arrival.jpg",
      name: "late.jpg",
    });

    await setStage(
      j(`/api/plans/${planId}/stage`, "POST", { to: "ic_onayda", actorName: "Derya", actorRole: "yonetici" }),
      planCtx(planId),
    );

    const res = await attachAsset(
      j(`/api/plans/${planId}/items/${target.id}/attach-asset`, "POST", { assetId: replacement.id }),
      itemCtx(planId, target.id),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).media[0].url).toBe("https://cdn.test/late-arrival.jpg");
  });

  it("refuses a type mismatch — a post slot can't take a reel asset", async () => {
    const { planId, items } = await seedGeneratedPlan();
    const target = items.find((i) => i.type === "post")!;
    const reelAsset = await addAsset(planId, {
      type: "reel",
      kind: "video",
      url: "https://cdn.test/clip.mp4",
      name: "clip.mp4",
    });

    const res = await attachAsset(
      j(`/api/plans/${planId}/items/${target.id}/attach-asset`, "POST", { assetId: reelAsset.id }),
      itemCtx(planId, target.id),
    );
    expect(res.status).toBe(400);
  });

  it("404s for an item that doesn't exist", async () => {
    const { planId } = await seedGeneratedPlan();
    const res = await attachAsset(
      j(`/api/plans/${planId}/items/nope/attach-asset`, "POST", { assetId: "x" }),
      itemCtx(planId, "nope"),
    );
    expect(res.status).toBe(404);
  });

  it("404s for an asset that doesn't exist", async () => {
    const { planId, items } = await seedGeneratedPlan();
    const target = items.find((i) => i.type === "post")!;
    const res = await attachAsset(
      j(`/api/plans/${planId}/items/${target.id}/attach-asset`, "POST", { assetId: "nope" }),
      itemCtx(planId, target.id),
    );
    expect(res.status).toBe(404);
  });
});
