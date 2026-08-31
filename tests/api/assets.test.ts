import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as addAssets, GET as listAssets, DELETE as delAsset } from "@/app/api/plans/[id]/assets/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
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
        rangeEnd: "2026-09-10",
        prompt: "her gün story, 2 günde bir post",
      }),
    )
  ).json();
}

describe("/api/plans/[id]/assets", () => {
  it("records uploads, groups a carousel, then generation uses them", async () => {
    const plan = await newPlan();

    const added = await (
      await addAssets(
        j(`/api/plans/${plan.id}/assets`, "POST", {
          items: [
            { type: "post", kind: "image", url: "https://cdn/x/elit-kaydirmali 1.jpg", name: "elit-kaydirmali 1.jpg" },
            { type: "post", kind: "image", url: "https://cdn/x/elit-kaydirmali 2.jpg", name: "elit-kaydirmali 2.jpg" },
            { type: "story", kind: "image", url: "https://cdn/x/s1.jpg", name: "s1.jpg" },
          ],
        }),
        ctx(plan.id),
      )
    ).json();
    expect(added).toHaveLength(3);
    const posts = added.filter((a: { type: string }) => a.type === "post");
    expect(posts[0].slideGroup).toBe(posts[1].slideGroup);
    expect([posts[0].slideOrder, posts[1].slideOrder].sort()).toEqual([1, 2]);

    const preview = await (
      await generate(j(`/api/plans/${plan.id}/generate`, "POST", {}), ctx(plan.id))
    ).json();
    expect(preview.usingRealAssets).toBe(true);

    const list = await (await listAssets(j(`/api/plans/${plan.id}/assets`, "GET"), ctx(plan.id))).json();
    expect(list).toHaveLength(3);

    const gone = await delAsset(
      j(`/api/plans/${plan.id}/assets?assetId=${added[0].id}`, "DELETE"),
      ctx(plan.id),
    );
    expect(gone.status).toBe(204);
    const after = await (await listAssets(j(`/api/plans/${plan.id}/assets`, "GET"), ctx(plan.id))).json();
    expect(after).toHaveLength(2);
  });

  it("rejects a non-editor", async () => {
    const plan = await newPlan();
    const res = await addAssets(
      new Request(`http://t/api/plans/${plan.id}/assets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: [{ type: "post", kind: "image", url: "u", name: "n.jpg" }] }),
      }),
      ctx(plan.id),
    );
    expect(res.status).toBe(403);
  });
});
