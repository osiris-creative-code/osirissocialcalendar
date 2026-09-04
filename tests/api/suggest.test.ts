import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as addAssets } from "@/app/api/plans/[id]/assets/route";
import { POST as suggest } from "@/app/api/plans/[id]/suggest/route";
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
        rangeEnd: "2026-09-14",
      }),
    )
  ).json();
}

describe("plan suggest", () => {
  it("returns a generic template when there is no content", async () => {
    const plan = await newPlan();
    const res = await suggest(j(`/api/plans/${plan.id}/suggest`, "POST"), ctx(plan.id));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.prompt).toMatch(/post/);
    expect(data.counts).toEqual({ post: 0, story: 0, reel: 0 });
  });

  it("reflects the uploaded content in the prompt", async () => {
    const plan = await newPlan();
    await addAssets(
      j(`/api/plans/${plan.id}/assets`, "POST", {
        items: [
          { type: "post", kind: "image", url: "https://cdn/x/post-a.jpg", name: "post-a.jpg" },
          { type: "post", kind: "image", url: "https://cdn/x/post-b.jpg", name: "post-b.jpg" },
          ...Array.from({ length: 14 }, (_, i) => ({
            type: "story" as const,
            kind: "image" as const,
            url: `https://cdn/x/s${i}.jpg`,
            name: `s${i}.jpg`,
          })),
        ],
      }),
      ctx(plan.id),
    );
    const res = await suggest(j(`/api/plans/${plan.id}/suggest`, "POST"), ctx(plan.id));
    const data = await res.json();
    expect(data.counts).toEqual({ post: 2, story: 14, reel: 0 });
    expect(data.prompt).toMatch(/7 günde bir post/);
    expect(data.prompt).toMatch(/her gün story/);
  });

  it("rejects a non-editor", async () => {
    const plan = await newPlan();
    const res = await suggest(
      new Request(`http://t/api/plans/${plan.id}/suggest`, { method: "POST" }),
      ctx(plan.id),
    );
    expect(res.status).toBe(403);
  });
});
