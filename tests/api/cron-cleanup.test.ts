import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { GET as getPlan } from "@/app/api/plans/[id]/route";
import { GET as listAssets, POST as addAssets } from "@/app/api/plans/[id]/assets/route";
import { GET as listBrands } from "@/app/api/brands/route";
import { GET as cleanup } from "@/app/api/cron/cleanup/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function planEnding(rangeEnd: string) {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(
      j("/api/plans", "POST", { brandId, title: "Eylül", rangeStart: "2020-01-01", rangeEnd, prompt: "her gün story" }),
    )
  ).json();
  await addAssets(
    j(`/api/plans/${plan.id}/assets`, "POST", {
      items: [
        { type: "post", kind: "image", url: "https://cdn/x/a.jpg", name: "a.jpg" },
        { type: "story", kind: "image", url: "https://cdn/x/b.jpg", name: "b.jpg" },
      ],
    }),
    ctx(plan.id),
  );
  return plan;
}

describe("cron cleanup", () => {
  it("purges media for plans whose range ended >14 days ago and leaves fresh ones alone", async () => {
    const old = await planEnding("2025-01-01");
    const recent = await planEnding("2999-01-01");

    const res = await cleanup(new Request("http://t/api/cron/cleanup"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plans).toBe(1);
    expect(body.files).toBe(2);
    expect(body.purged[0].id).toBe(old.id);

    const oldAssets = await (await listAssets(j(`/api/plans/${old.id}/assets`, "GET"), ctx(old.id))).json();
    expect(oldAssets).toHaveLength(0);
    const oldPlan = await (await getPlan(j(`/api/plans/${old.id}`, "GET"), ctx(old.id))).json();
    expect(oldPlan.plan.mediaPurgedAt).toBeTruthy();

    const recentAssets = await (
      await listAssets(j(`/api/plans/${recent.id}/assets`, "GET"), ctx(recent.id))
    ).json();
    expect(recentAssets).toHaveLength(2);
  });

  it("is a no-op on the second run", async () => {
    await planEnding("2025-01-01");
    await cleanup(new Request("http://t/api/cron/cleanup"));
    const second = await cleanup(new Request("http://t/api/cron/cleanup"));
    const body = await second.json();
    expect(body.plans).toBe(0);
    expect(body.files).toBe(0);
  });

  it("rejects an unauthorized call when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "s3cr3t";
    try {
      const bad = await cleanup(new Request("http://t/api/cron/cleanup"));
      expect(bad.status).toBe(401);
      const ok = await cleanup(
        new Request("http://t/api/cron/cleanup", { headers: { authorization: "Bearer s3cr3t" } }),
      );
      expect(ok.status).toBe(200);
    } finally {
      delete process.env.CRON_SECRET;
    }
  });
});
