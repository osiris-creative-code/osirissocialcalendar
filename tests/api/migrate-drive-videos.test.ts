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

const BROKEN_URL = "https://www.googleapis.com/drive/v3/files/BROKENFILE123?alt=media&key=SOMEKEY";

async function seedPlanWithBrokenReel() {
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

  // Seeded directly through the store — this is the shape a fresh import or the
  // previous (now-reversed) direction of this same route left behind.
  const store = getStore();
  const [brokenAsset] = await store.addAssets(plan.id, [
    {
      type: "reel",
      kind: "video",
      url: BROKEN_URL,
      name: "broken.mp4",
      slideGroup: null,
      slideOrder: 1,
      webPlayable: true,
      posterUrl: "https://drive.google.com/thumbnail?id=BROKENFILE123",
    },
  ]);
  await store.addAssets(plan.id, [
    {
      type: "reel",
      kind: "video",
      url: "https://drive.google.com/file/d/ALREADYFINE/preview",
      name: "fine.mp4",
      slideGroup: null,
      slideOrder: 1,
      webPlayable: true,
      driveEmbed: true,
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
    j(`/api/plans/${plan.id}/items/${target.id}/attach-asset`, "POST", { assetId: brokenAsset.id }),
    itemCtx(plan.id, target.id),
  );

  return { planId: plan.id as string, itemId: target.id as string };
}

describe("migrate-drive-videos — reverts the broken driveDownloadUrl shape", () => {
  it("developer only", async () => {
    const res = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, AUTH));
    expect(res.status).toBe(403);
  });

  it("needs no API key — rebuilding a /preview url only needs the file id", async () => {
    const res = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    expect(res.status).toBe(200);
  });

  it("puts broken-shape assets and item media back on Drive's /preview iframe, leaves the rest alone, and is a no-op on rerun", async () => {
    const { planId, itemId } = await seedPlanWithBrokenReel();

    const first = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    expect(first.status).toBe(200);
    const summary = await first.json();
    expect(summary.assetsFixed).toBe(1);
    expect(summary.itemsFixed).toBe(1);

    const assets = await (await listAssets(j(`/api/plans/${planId}/assets`, "GET", undefined), planCtx(planId))).json();
    const fixed = assets.find((a: { name: string }) => a.name === "broken.mp4");
    expect(fixed.url).toBe("https://drive.google.com/file/d/BROKENFILE123/preview");
    expect(fixed.driveEmbed).toBe(true);

    const untouchedVideo = assets.find((a: { name: string }) => a.name === "fine.mp4");
    expect(untouchedVideo.url).toBe("https://drive.google.com/file/d/ALREADYFINE/preview");
    const image = assets.find((a: { name: string }) => a.name === "p1.jpg");
    expect(image.url).toBe("https://cdn.test/p1.jpg");

    const planRes = await getPlan(j(`/api/plans/${planId}`, "GET", undefined), planCtx(planId));
    const { items } = await planRes.json();
    const item = items.find((i: { id: string }) => i.id === itemId);
    expect(item.media[0].url).toBe("https://drive.google.com/file/d/BROKENFILE123/preview");
    expect(item.media[0].driveEmbed).toBe(true);

    const second = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    const secondSummary = await second.json();
    expect(secondSummary.assetsFixed).toBe(0);
    expect(secondSummary.itemsFixed).toBe(0);
  });
});
