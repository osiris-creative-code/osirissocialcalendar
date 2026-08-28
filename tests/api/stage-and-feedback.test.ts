import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as stage } from "@/app/api/plans/[id]/stage/route";
import { POST as addComment, GET as listComments } from "@/app/api/plans/[id]/comments/route";
import { POST as submit } from "@/app/api/plans/[id]/submit/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { GET as getPlan } from "@/app/api/plans/[id]/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function makePlan() {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  return (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "T",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-10",
        prompt: "her gün story",
      }),
    )
  ).json();
}

describe("stage machine over HTTP", () => {
  it("mints a public token only at markaya_hazir -> markada", async () => {
    const plan = await makePlan();
    const step = (to: string) =>
      stage(j(`/api/plans/${plan.id}/stage`, "POST", { to, actorName: "Derya", actorRole: "yonetici" }), ctx(plan.id));

    expect((await step("ic_onayda")).status).toBe(200);
    let p = await (await step("markaya_hazir")).json();
    expect(p.publicToken).toBeNull();
    p = await (await step("markada")).json();
    expect(p.publicToken).toMatch(/^c_/);

    const bad = await step("taslak");
    expect(bad.status).toBe(400);
  });
});

describe("comments + submit", () => {
  it("stores a brand comment and lets the brand submit a revision round", async () => {
    const plan = await makePlan();
    // generate some items so we have an itemId
    await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }), ctx(plan.id));
    const full = await (await getPlan(j(`/api/plans/${plan.id}`, "GET"), ctx(plan.id))).json();
    const itemId = full.items[0].id as string;

    // advance to markada
    for (const to of ["ic_onayda", "markaya_hazir", "markada"]) {
      await stage(j(`/api/plans/${plan.id}/stage`, "POST", { to, actorName: "Derya", actorRole: "yonetici" }), ctx(plan.id));
    }

    const c = await (
      await addComment(
        j(`/api/plans/${plan.id}/comments`, "POST", {
          itemId,
          stage: "brand",
          authorName: "Müşteri",
          authorRole: "marka",
          body: "Logo büyük olsun",
          status: "changes",
        }),
        ctx(plan.id),
      )
    ).json();
    expect(c.body).toBe("Logo büyük olsun");

    const list = await (await listComments(j(`/api/plans/${plan.id}/comments`, "GET"), ctx(plan.id))).json();
    expect(list).toHaveLength(1);

    const res = await (
      await submit(j(`/api/plans/${plan.id}/submit`, "POST", { round: "revize", authorName: "Müşteri" }), ctx(plan.id))
    ).json();
    expect(res.stage).toBe("revize_istendi");
  });
});
