import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as addAssets } from "@/app/api/plans/[id]/assets/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { POST as addComment } from "@/app/api/plans/[id]/comments/route";
import { POST as mergeItems } from "@/app/api/plans/[id]/merge-items/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function seedGeneratedPlan(rangeStart: string, rangeEnd: string, prompt: string) {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(j("/api/plans", "POST", { brandId, title: "MergeItems", rangeStart, rangeEnd, prompt }))
  ).json();
  await addAssets(
    j(`/api/plans/${plan.id}/assets`, "POST", {
      items: [
        { type: "post", kind: "image", url: "https://cdn.test/p1.jpg", name: "p1.jpg" },
        { type: "post", kind: "image", url: "https://cdn.test/p2.jpg", name: "p2.jpg" },
        { type: "story", kind: "image", url: "https://cdn.test/s1.jpg", name: "s1.jpg" },
      ],
    }),
    ctx(plan.id),
  );
  const genRes = await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }), ctx(plan.id));
  const data = await genRes.json();
  return { planId: plan.id as string, items: data.items as { id: string; type: string; date: string }[] };
}

describe("merge-items — manual carousel after generation", () => {
  it("merges two post items into one, keeping the earlier date", async () => {
    const { planId, items } = await seedGeneratedPlan("2026-09-01", "2026-09-02", "her gun post");
    const posts = items.filter((i) => i.type === "post").sort((a, b) => a.date.localeCompare(b.date));
    expect(posts.length).toBeGreaterThanOrEqual(2);

    const res = await mergeItems(
      j(`/api/plans/${planId}/merge-items`, "POST", { itemIds: [posts[0].id, posts[1].id] }),
      ctx(planId),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const survivor = data.items.find((i: { id: string }) => i.id === posts[0].id);
    expect(survivor).toBeTruthy();
    expect(survivor.media).toHaveLength(2);
    expect(data.items.some((i: { id: string }) => i.id === posts[1].id)).toBe(false);
  });

  it("moves existing feedback from the merged-away item onto the survivor", async () => {
    const { planId, items } = await seedGeneratedPlan("2026-09-05", "2026-09-06", "her gun post");
    const posts = items.filter((i) => i.type === "post").sort((a, b) => a.date.localeCompare(b.date));

    await addComment(
      j(`/api/plans/${planId}/comments`, "POST", {
        itemId: posts[1].id,
        stage: "internal",
        authorName: "Mert",
        authorRole: "onaylayan",
        body: "burayı düzelt",
        status: "changes",
      }),
      ctx(planId),
    );

    const res = await mergeItems(
      j(`/api/plans/${planId}/merge-items`, "POST", { itemIds: [posts[0].id, posts[1].id] }),
      ctx(planId),
    );
    expect(res.status).toBe(200);

    const { getStore } = await import("@/lib/db");
    const comments = await getStore().listComments(planId);
    expect(comments).toHaveLength(1);
    expect(comments[0].planItemId).toBe(posts[0].id);
  });

  it("refuses a story mixed in with a post", async () => {
    const { planId, items } = await seedGeneratedPlan("2026-09-10", "2026-09-11", "her gun post, her gun story");
    const post = items.find((i) => i.type === "post")!;
    const story = items.find((i) => i.type === "story")!;

    const res = await mergeItems(
      j(`/api/plans/${planId}/merge-items`, "POST", { itemIds: [post.id, story.id] }),
      ctx(planId),
    );
    expect(res.status).toBe(400);
  });

  it("refuses fewer than two items", async () => {
    const { planId, items } = await seedGeneratedPlan("2026-09-15", "2026-09-15", "her gun post");
    const post = items.find((i) => i.type === "post")!;
    const res = await mergeItems(j(`/api/plans/${planId}/merge-items`, "POST", { itemIds: [post.id] }), ctx(planId));
    expect(res.status).toBe(400);
  });
});
