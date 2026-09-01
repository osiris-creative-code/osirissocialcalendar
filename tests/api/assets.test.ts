import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { GET as listAssets, POST as addAssets } from "@/app/api/plans/[id]/assets/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function newPlan() {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  return (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Eylül",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-21",
        prompt: "haftada 1 reels",
      }),
    )
  ).json();
}

describe("asset recording — video playability", () => {
  it("marks a .mov video as not web-playable and passes a poster through", async () => {
    const plan = await newPlan();
    await addAssets(
      j(`/api/plans/${plan.id}/assets`, "POST", {
        items: [
          { type: "reel", kind: "video", url: "https://cdn/x/a.mov", name: "a.mov", posterUrl: "https://cdn/x/a.jpg" },
          { type: "reel", kind: "video", url: "https://cdn/x/b.mp4", name: "b.mp4" },
        ],
      }),
      ctx(plan.id),
    );
    const assets = await (await listAssets(j(`/api/plans/${plan.id}/assets`, "GET"), ctx(plan.id))).json();
    const mov = assets.find((a: { name: string }) => a.name === "a.mov");
    const mp4 = assets.find((a: { name: string }) => a.name === "b.mp4");
    expect(mov.webPlayable).toBe(false);
    expect(mov.posterUrl).toBe("https://cdn/x/a.jpg");
    expect(mp4.webPlayable).toBe(true);
  });
});
