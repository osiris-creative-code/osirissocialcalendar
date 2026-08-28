import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { GET as getPlan } from "@/app/api/plans/[id]/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (url: string, m: string, b?: unknown) =>
  new Request("http://t" + url, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });

async function firstBrandId() {
  const r = await listBrands(j("/api/brands", "GET"));
  return (await r.json())[0].id as string;
}

describe("/api/plans", () => {
  it("creates then generates a plan with a content-gap preview", async () => {
    const brandId = await firstBrandId();
    const created = await (
      await createPlan(
        j("/api/plans", "POST", {
          brandId,
          title: "Eylül",
          rangeStart: "2026-08-28",
          rangeEnd: "2026-09-11",
          prompt: "2 günde bir post, her gün story, haftada 1 reels. 7 Eylül'e özel post.",
        }),
      )
    ).json();
    expect(created.stage).toBe("taslak");

    const ctx = { params: Promise.resolve({ id: created.id }) };

    const preview = await (await generate(j(`/api/plans/${created.id}/generate`, "POST", {}), ctx)).json();
    expect(preview.ruleCount).toBeGreaterThanOrEqual(3);
    expect(typeof preview.gap).toBe("boolean");

    const written = await (
      await generate(j(`/api/plans/${created.id}/generate`, "POST", { mode: "extend" }), ctx)
    ).json();
    expect(written.items.length).toBeGreaterThan(0);

    const full = await (await getPlan(j(`/api/plans/${created.id}`, "GET"), ctx)).json();
    expect(full.items).toHaveLength(written.items.length);
    expect(
      full.items.filter((i: { type: string }) => i.type === "story").every((i: { caption: unknown }) => i.caption === null),
    ).toBe(true);
  });

  it("create requires an editor actor", async () => {
    const res = await createPlan(
      new Request("http://t/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId: "x", title: "t", rangeStart: "2026-09-01", rangeEnd: "2026-09-02" }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
