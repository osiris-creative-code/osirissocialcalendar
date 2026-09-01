import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { GET as getPlan } from "@/app/api/plans/[id]/route";
import { PATCH as togglePublish, POST as publishAction } from "@/app/api/plans/[id]/publish/route";
import { GET as listBrands } from "@/app/api/brands/route";
import { getStore } from "@/lib/db";
import { publishStats } from "@/lib/publish";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function approvedPlan() {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Eylül",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-10",
        prompt: "2 günde bir post",
      }),
    )
  ).json();
  await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }), ctx(plan.id));
  await getStore().updatePlan(plan.id, { stage: "onaylandi" });
  return plan;
}

describe("publish flow", () => {
  it("start → toggle every slot → auto tamamlandi → revert clears", async () => {
    const plan = await approvedPlan();

    const started = await publishAction(
      j(`/api/plans/${plan.id}/publish`, "POST", { action: "start" }),
      ctx(plan.id),
    );
    expect(started.status).toBe(200);
    expect((await started.json()).plan.stage).toBe("yayinda");

    const full = await (await getPlan(j(`/api/plans/${plan.id}`, "GET"), ctx(plan.id))).json();
    const real = (full.items as { id: string; isGap: boolean; hidden: boolean }[]).filter(
      (i) => !i.isGap && !i.hidden,
    );
    expect(real.length).toBeGreaterThan(0);

    let last: Response | undefined;
    for (const it of real) {
      last = await togglePublish(
        j(`/api/plans/${plan.id}/publish`, "PATCH", { itemId: it.id, published: true }),
        ctx(plan.id),
      );
    }
    const afterAll = await last!.json();
    expect(afterAll.plan.stage).toBe("tamamlandi");
    expect(publishStats(afterAll.items)).toEqual({ published: real.length, total: real.length });

    const reverted = await publishAction(
      j(`/api/plans/${plan.id}/publish`, "POST", { action: "revert" }),
      ctx(plan.id),
    );
    const rev = await reverted.json();
    expect(rev.plan.stage).toBe("onaylandi");
    expect(rev.items.every((i: { publishedAt: string | null }) => i.publishedAt === null)).toBe(true);
  });

  it("rejects a non-editor toggle", async () => {
    const plan = await approvedPlan();
    await publishAction(j(`/api/plans/${plan.id}/publish`, "POST", { action: "start" }), ctx(plan.id));
    const res = await togglePublish(
      new Request(`http://t/api/plans/${plan.id}/publish`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: "x", published: true }),
      }),
      ctx(plan.id),
    );
    expect(res.status).toBe(403);
  });

  it("won't start unless the plan is onaylandi", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
    const plan = await (
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
    const res = await publishAction(
      j(`/api/plans/${plan.id}/publish`, "POST", { action: "start" }),
      ctx(plan.id),
    );
    expect(res.status).toBe(400);
  });
});
