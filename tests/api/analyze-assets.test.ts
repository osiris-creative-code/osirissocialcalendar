import { describe, it, expect, vi } from "vitest";

// The model is asked not to suggest a carousel for anything but a post, but it
// can still get that wrong — this stub deliberately answers "carousel" for a
// story run, the way the real thing did in production.
const groupSimilarSpy = vi.fn(async (req: { candidates: { id: string }[] }) => ({
  verdicts: req.candidates.map((c) => ({ candidateId: c.id, verdict: "carousel" as const, reason: "aynı seri" })),
}));

vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai")>();
  return {
    ...actual,
    getAI: () => ({
      captions: vi.fn(),
      rewriteCaption: vi.fn(),
      analyzeFeed: vi.fn(),
      suggestPlan: vi.fn(),
      groupSimilar: groupSimilarSpy,
      reviewCalendar: vi.fn(),
    }),
  };
});

import { POST as createPlan } from "@/app/api/plans/route";
import { POST as addAssets } from "@/app/api/plans/[id]/assets/route";
import { POST as analyzeAssets } from "@/app/api/plans/[id]/analyze-assets/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function seedPlan(items: { type: "post" | "story" | "reel"; kind: "image" | "video"; name: string; url?: string }[]) {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(j("/api/plans", "POST", { brandId, title: "Analiz", rangeStart: "2026-09-01", rangeEnd: "2026-09-07", prompt: "" }), )
  ).json();
  const withUrls = items.map((it, i) => ({ url: `https://cdn.test/${it.name}-${i}`, ...it }));
  await addAssets(j(`/api/plans/${plan.id}/assets`, "POST", { items: withUrls }), ctx(plan.id));
  return plan.id as string;
}

describe("analyze-assets", () => {
  it("never offers a carousel for a story or reels run, even when the model says so", async () => {
    groupSimilarSpy.mockClear();
    const planId = await seedPlan([
      { type: "story", kind: "image", name: "RF_STORY1.jpg" },
      { type: "story", kind: "image", name: "RF_STORY2.jpg" },
      { type: "reel", kind: "video", name: "RF_REEL1.mp4" },
      { type: "reel", kind: "video", name: "RF_REEL2.mp4" },
    ]);

    const res = await analyzeAssets(j(`/api/plans/${planId}/analyze-assets`, "POST"), ctx(planId));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions.length).toBeGreaterThan(0);
    for (const s of data.suggestions) expect(s.kind).toBe("spread");
  });

  it("does allow a carousel for a post run", async () => {
    const planId = await seedPlan([
      { type: "post", kind: "image", name: "IMG_2201.jpg" },
      { type: "post", kind: "image", name: "IMG_2202.jpg" },
    ]);

    const res = await analyzeAssets(j(`/api/plans/${planId}/analyze-assets`, "POST"), ctx(planId));
    const data = await res.json();
    expect(data.suggestions).toHaveLength(1);
    expect(data.suggestions[0].kind).toBe("carousel");
  });

  it("includes each asset's url so the panel can show a real thumbnail", async () => {
    const planId = await seedPlan([
      { type: "post", kind: "image", name: "IMG_3001.jpg" },
      { type: "post", kind: "image", name: "IMG_3002.jpg" },
    ]);

    const res = await analyzeAssets(j(`/api/plans/${planId}/analyze-assets`, "POST"), ctx(planId));
    const data = await res.json();
    expect(data.suggestions[0].urls).toHaveLength(2);
    expect(data.suggestions[0].urls.every((u: string) => typeof u === "string" && u.length > 0)).toBe(true);
  });
});
