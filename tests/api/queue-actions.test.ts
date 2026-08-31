import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { GET as getPlan, DELETE as deletePlan } from "@/app/api/plans/[id]/route";
import { POST as addAssets } from "@/app/api/plans/[id]/assets/route";
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

async function newPlan(prompt = "haftada 1 reels") {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  return (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Eylül",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-21",
        prompt,
      }),
    )
  ).json();
}

describe("delete plan", () => {
  it("removes the plan and 404s afterwards", async () => {
    const plan = await newPlan();
    const del = await deletePlan(j(`/api/plans/${plan.id}`, "DELETE"), ctx(plan.id));
    expect(del.status).toBe(204);
    const after = await getPlan(j(`/api/plans/${plan.id}`, "GET"), ctx(plan.id));
    expect(after.status).toBe(404);
  });

  it("rejects a non-editor", async () => {
    const plan = await newPlan();
    const res = await deletePlan(
      new Request(`http://t/api/plans/${plan.id}`, { method: "DELETE" }),
      ctx(plan.id),
    );
    expect(res.status).toBe(403);
  });
});

describe("reel placeholder", () => {
  it("flows through generation as a placeholder item with no file", async () => {
    const plan = await newPlan("her gün story, haftada 1 reels");
    await addAssets(
      j(`/api/plans/${plan.id}/assets`, "POST", {
        items: [
          { type: "reel", kind: "video", url: "", name: "Reels placeholder", placeholder: true },
        ],
      }),
      ctx(plan.id),
    );
    await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }), ctx(plan.id));
    const full = await (await getPlan(j(`/api/plans/${plan.id}`, "GET"), ctx(plan.id))).json();
    const reel = full.items.find((i: { type: string }) => i.type === "reel");
    expect(reel.placeholder).toBe(true);
    expect(reel.media[0].url).toBe("");
    expect(reel.isGap).toBe(false);
  });
});
