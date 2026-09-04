import { describe, it, expect, vi } from "vitest";

const captionsSpy = vi.fn(async (req: { items: unknown[] }) => ({
  captions: req.items.map(() => "caption"),
}));

vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai")>();
  return {
    ...actual,
    getAI: () => ({
      captions: captionsSpy,
      rewriteCaption: vi.fn(),
      analyzeFeed: vi.fn(),
      suggestPlan: vi.fn(),
    }),
  };
});

import { POST as createPlan } from "@/app/api/plans/route";
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

async function planWithPosts(count: number) {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Vizyon",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-30",
        prompt: "her gün post",
      }),
    )
  ).json();
  await addAssets(
    j(`/api/plans/${plan.id}/assets`, "POST", {
      items: Array.from({ length: count }, (_, i) => ({
        type: "post" as const,
        kind: "image" as const,
        url: `https://cdn/x/post-${String.fromCharCode(97 + i)}.jpg`,
        name: `post-${String.fromCharCode(97 + i)}.jpg`,
      })),
    }),
    ctx(plan.id),
  );
  return plan;
}

describe("runGenerate vision cap", () => {
  it("sends vision for a small batch", async () => {
    captionsSpy.mockClear();
    const plan = await planWithPosts(5);
    await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "stopAtAssets" }), ctx(plan.id));
    expect(captionsSpy).toHaveBeenCalledTimes(1);
    const req = captionsSpy.mock.calls[0][0] as { vision: boolean; items: { imageUrl: string | null }[] };
    expect(req.vision).toBe(true);
    expect(req.items.some((it) => it.imageUrl)).toBe(true);
  });

  it("drops vision once the batch is large, but still generates captions for every item", async () => {
    captionsSpy.mockClear();
    const plan = await planWithPosts(20);
    const res = await generate(
      j(`/api/plans/${plan.id}/generate`, "POST", { mode: "stopAtAssets" }),
      ctx(plan.id),
    );
    expect(res.status).toBe(200);
    const req = captionsSpy.mock.calls[0][0] as { vision: boolean; items: { imageUrl: string | null }[] };
    expect(req.vision).toBe(false);
    expect(req.items.every((it) => it.imageUrl === null)).toBe(true);
    expect(req.items).toHaveLength(20);
  });
});
