import { describe, it, expect, afterEach } from "vitest";
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

const OLD_URL = "https://drive.google.com/file/d/OLDFILE123/preview";

async function seedPlanWithOldReel() {
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

  // Seeded directly through the store, the way the old import-drive route used
  // to write these — the /assets API route never accepted driveEmbed, so real
  // legacy rows only exist this way.
  const store = getStore();
  const [oldAsset] = await store.addAssets(plan.id, [
    {
      type: "reel",
      kind: "video",
      url: OLD_URL,
      name: "old.mp4",
      slideGroup: null,
      slideOrder: 1,
      webPlayable: true,
      posterUrl: "https://drive.google.com/thumbnail?id=OLDFILE123",
      driveEmbed: true,
    },
  ]);
  await store.addAssets(plan.id, [
    {
      type: "reel",
      kind: "video",
      url: "https://www.googleapis.com/drive/v3/files/NEWFILE?alt=media&key=KEY",
      name: "new.mp4",
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
    j(`/api/plans/${plan.id}/items/${target.id}/attach-asset`, "POST", { assetId: oldAsset.id }),
    itemCtx(plan.id, target.id),
  );

  return { planId: plan.id as string, itemId: target.id as string };
}

afterEach(() => {
  delete process.env.GOOGLE_API_KEY;
});

describe("migrate-drive-videos", () => {
  it("developer only", async () => {
    process.env.GOOGLE_API_KEY = "KEY";
    const res = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, AUTH));
    expect(res.status).toBe(403);
  });

  it("requires GOOGLE_API_KEY", async () => {
    const res = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    expect(res.status).toBe(400);
  });

  it("rewrites old-shape assets and item media, leaves the rest alone, and is a no-op on rerun", async () => {
    process.env.GOOGLE_API_KEY = "KEY";
    const { planId, itemId } = await seedPlanWithOldReel();

    const first = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    expect(first.status).toBe(200);
    const summary = await first.json();
    expect(summary.assetsFixed).toBe(1);
    expect(summary.itemsFixed).toBe(1);

    const assets = await (await listAssets(j(`/api/plans/${planId}/assets`, "GET", undefined), planCtx(planId))).json();
    const fixed = assets.find((a: { name: string }) => a.name === "old.mp4");
    expect(fixed.url).toBe("https://www.googleapis.com/drive/v3/files/OLDFILE123?alt=media&key=KEY");
    expect(fixed.driveEmbed).toBeUndefined();

    const untouchedVideo = assets.find((a: { name: string }) => a.name === "new.mp4");
    expect(untouchedVideo.url).toBe("https://www.googleapis.com/drive/v3/files/NEWFILE?alt=media&key=KEY");
    const image = assets.find((a: { name: string }) => a.name === "p1.jpg");
    expect(image.url).toBe("https://cdn.test/p1.jpg");

    const planRes = await getPlan(j(`/api/plans/${planId}`, "GET", undefined), planCtx(planId));
    const { items } = await planRes.json();
    const item = items.find((i: { id: string }) => i.id === itemId);
    expect(item.media[0].url).toBe("https://www.googleapis.com/drive/v3/files/OLDFILE123?alt=media&key=KEY");
    expect(item.media[0].driveEmbed).toBeUndefined();

    const second = await migrate(j("/api/dev/migrate-drive-videos", "POST", {}, DEV_AUTH));
    const secondSummary = await second.json();
    expect(secondSummary.assetsFixed).toBe(0);
    expect(secondSummary.itemsFixed).toBe(0);
  });
});
