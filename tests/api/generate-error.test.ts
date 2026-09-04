import { describe, it, expect, vi } from "vitest";

// A vision-shaped failure — e.g. the real bug this covers, an API rejection
// from a bad media_type — surfaces as a thrown error from captions().
const captionsSpy = vi.fn(async () => {
  throw new Error("400 Invalid media_type: image/jpg is not one of ['image/jpeg', ...]");
});

vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai")>();
  return {
    ...actual,
    getAI: () => ({
      captions: captionsSpy,
      rewriteCaption: vi.fn(),
      analyzeFeed: vi.fn(),
      suggestPlan: vi.fn(),
      groupSimilar: vi.fn(),
      reviewCalendar: vi.fn(),
    }),
  };
});

import { POST as createPlan } from "@/app/api/plans/route";
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

describe("generate — AI failure", () => {
  it("returns a JSON error instead of an opaque platform 500 when the AI call throws", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
    const plan = await (
      await createPlan(
        j("/api/plans", "POST", {
          brandId,
          title: "Hata testi",
          rangeStart: "2026-09-01",
          rangeEnd: "2026-09-03",
          prompt: "her gun post",
        }),
      )
    ).json();

    const res = await generate(
      j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }),
      ctx(plan.id),
    );

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("Üretilemedi");
    expect(data.error).toContain("media_type");
    expect(captionsSpy).toHaveBeenCalled();
  });
});
