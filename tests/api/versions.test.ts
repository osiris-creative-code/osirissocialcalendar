import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { POST as stage } from "@/app/api/plans/[id]/stage/route";
import { POST as saveVersion, GET as listVersions } from "@/app/api/plans/[id]/versions/route";
import { PATCH as patchPlan } from "@/app/api/plans/[id]/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("plan versions", () => {
  it("snapshots on generate + first publish, and on manual save", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
    const plan = await (
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

    await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }), ctx(plan.id));
    let versions = await (await listVersions(j(`/api/plans/${plan.id}/versions`, "GET"), ctx(plan.id))).json();
    expect(versions.map((v: { label: string }) => v.label)).toContain("AI üretimi");

    for (const to of ["ic_onayda", "markaya_hazir", "markada"]) {
      await stage(
        j(`/api/plans/${plan.id}/stage`, "POST", { to, actorName: "Derya", actorRole: "yonetici" }),
        ctx(plan.id),
      );
    }
    versions = await (await listVersions(j(`/api/plans/${plan.id}/versions`, "GET"), ctx(plan.id))).json();
    expect(versions.map((v: { label: string }) => v.label)).toContain("İlk yayın");

    const manual = await saveVersion(
      j(`/api/plans/${plan.id}/versions`, "POST", { label: "kontrol" }),
      ctx(plan.id),
    );
    expect((await manual.json()).label).toBe("kontrol");
  });

  it("PATCH sets and clears the revise deadline", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
    const plan = await (
      await createPlan(
        j("/api/plans", "POST", {
          brandId, title: "T", rangeStart: "2026-09-01", rangeEnd: "2026-09-02", prompt: "",
        }),
      )
    ).json();

    let res = await patchPlan(j(`/api/plans/${plan.id}`, "PATCH", { reviseDeadline: "2026-09-15" }), ctx(plan.id));
    expect((await res.json()).plan.reviseDeadline).toBe("2026-09-15");

    res = await patchPlan(j(`/api/plans/${plan.id}`, "PATCH", { reviseDeadline: null }), ctx(plan.id));
    expect((await res.json()).plan.reviseDeadline).toBeNull();
  });
});
