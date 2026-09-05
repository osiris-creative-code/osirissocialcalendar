import { describe, it, expect } from "vitest";
import { getStore } from "@/lib/db";
import { POST as createPlan } from "@/app/api/plans/route";
import { GET as listAssets } from "@/app/api/plans/[id]/assets/route";
import { GET as getPlan } from "@/app/api/plans/[id]/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { POST as attachAsset } from "@/app/api/plans/[id]/items/[itemId]/attach-asset/route";
import { POST as migrate } from "@/app/api/dev/migrate-drive-videos/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const DEV_AUTH = "ritim_team=1; ritim_dev=1; ritim_actor=K|developer";
const j = (u: string, m: string, b: unknown, cookie = AUTH) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(b),
  });
const planCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const itemCtx = (id: string, itemId: string) => ({ params: Promise.resolve({ id, itemId }) });

async function seedPlanWithOldShapeReels() {
  const brandId = (await (await listBrands(j("/api/brands", "GET", undefined))).json())[0].id;
  const plan = await (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Migrate Drive Videos",
        rangeStart: "2026-09-05",
        rangeEnd: "2026-09-05",
        prompt: "her gun reels",
      }),
    )
  ).json();

  const store = getStore();
  // one on each prior shape this route (or a live import) could have produced
  const [previewAsset] = await store.addAssets(plan.id, [
    {
      type: "reel",
      kind: "video",
      url: "https://drive.google.com/file/d/PREVIEWFILE/preview",
      name: "preview.mp4",
      slideGroup: null,
      slideOrder: 1,
      webPlayable: true,
      posterUrl: "https://drive.google.com/thumbnail?id=PREVIEWFILE",
      driveEmbed: true,
    },
  ]);
  await store.addAssets(plan.id, [
    {
      type: "reel",
      kind: "video",
      url: "https://www.googleapis.com/drive/v3/files/DOWNLOADFILE?alt=media&key=SOMEKEY",
      name: "download.mp4",
      slideGroup: null,
      slideOrder: 1,
      webPlayable: true,
    },
    {
      type: "reel",
      kind: "video",
      url: "/api/drive-video/ALREADYFINE",
      name: "fine.mp4",
      slideGroup: null,
      slideOrder: 1,
      webPlayable: true,
    },
    {
      type: "post",
      kind: "image",
      url: "https://cdn.test/p1.jpg",
      name: "p1.jpg",
      slideGroup: null,
      slideOrder: 1,
    },
  ]);

  const genRes = await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }), planCtx(plan.id));
  const { items } = await genRes.json();
  const target = items[0];
  await attachAsset(
    j(`/api/plans/${plan.id}/items/${target.id}/attach-asset`, "POST", { assetId: previewAsset.id }),
    itemCtx(plan.id, target.id),
  );

  return { planId: plan.id as string, itemId: target.id as string };
}

describe("migrate-drive-videos — converges every prior shape onto our own proxy", () => {
  it("developer only", async () => {
    const res = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, AUTH));
    expect(res.status).toBe(403);
  });

  it("needs no API key — rebuilding a proxy url only needs the file id", async () => {
    const res = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    expect(res.status).toBe(200);
  });

  it("fixes both prior shapes, leaves an already-proxied asset and a plain image alone, and is a no-op on rerun", async () => {
    const { planId, itemId } = await seedPlanWithOldShapeReels();

    const first = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    expect(first.status).toBe(200);
    const summary = await first.json();
    expect(summary.assetsFixed).toBe(2); // preview.mp4 + download.mp4
    expect(summary.itemsFixed).toBe(1); // the attached item, which pointed at preview.mp4

    const assets = await (await listAssets(j(`/api/plans/${planId}/assets`, "GET", undefined), planCtx(planId))).json();
    const preview = assets.find((a: { name: string }) => a.name === "preview.mp4");
    expect(preview.url).toBe("/api/drive-video/PREVIEWFILE");
    expect(preview.driveEmbed).toBeUndefined();

    const download = assets.find((a: { name: string }) => a.name === "download.mp4");
    expect(download.url).toBe("/api/drive-video/DOWNLOADFILE");

    const fine = assets.find((a: { name: string }) => a.name === "fine.mp4");
    expect(fine.url).toBe("/api/drive-video/ALREADYFINE"); // untouched

    const image = assets.find((a: { name: string }) => a.name === "p1.jpg");
    expect(image.url).toBe("https://cdn.test/p1.jpg"); // untouched

    const planRes = await getPlan(j(`/api/plans/${planId}`, "GET", undefined), planCtx(planId));
    const { items } = await planRes.json();
    const item = items.find((i: { id: string }) => i.id === itemId);
    expect(item.media[0].url).toBe("/api/drive-video/PREVIEWFILE");
    expect(item.media[0].driveEmbed).toBeUndefined();

    const second = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    const secondSummary = await second.json();
    expect(secondSummary.assetsFixed).toBe(0);
    expect(secondSummary.itemsFixed).toBe(0);
  });
});
