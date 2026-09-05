import { describe, it, expect } from "vitest";
import { POST as createPlan } from "@/app/api/plans/route";
import { POST as addAssets } from "@/app/api/plans/[id]/assets/route";
import { POST as generate } from "@/app/api/plans/[id]/generate/route";
import { POST as addComment } from "@/app/api/plans/[id]/comments/route";
import { POST as addAnnotation } from "@/app/api/plans/[id]/annotations/route";
import { POST as setStage } from "@/app/api/plans/[id]/stage/route";
import { GET as listBrands } from "@/app/api/brands/route";
import BrandCalendarPage from "@/app/c/[token]/page";
import InternalPreviewPage from "@/app/i/[token]/page";
import type { ReactElement } from "react";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

/** Both pages render <BrandViewClient>/<InternalClient> as their only child of a fragment. */
function clientProps(el: ReactElement): { comments: unknown[]; annotations: unknown[] } {
  const fragment = el as unknown as { props: { children: ReactElement[] } };
  const client = fragment.props.children.find(
    (c) => c && typeof c === "object" && "props" in c && (c.props as { comments?: unknown }).comments,
  )!;
  return client.props as { comments: unknown[]; annotations: unknown[] };
}

async function seedPlanWithBothStageFeedback() {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  const plan = await (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Stage Filter",
        rangeStart: "2026-09-05",
        rangeEnd: "2026-09-05",
        prompt: "her gun post",
      }),
    )
  ).json();
  await addAssets(
    j(`/api/plans/${plan.id}/assets`, "POST", {
      items: [{ type: "post", kind: "image", url: "https://cdn.test/p1.jpg", name: "p1.jpg" }],
    }),
    ctx(plan.id),
  );
  const genRes = await generate(j(`/api/plans/${plan.id}/generate`, "POST", { mode: "extend" }), ctx(plan.id));
  const { items } = await genRes.json();
  const itemId = items[0].id;

  await addComment(
    j(`/api/plans/${plan.id}/comments`, "POST", {
      itemId,
      stage: "internal",
      authorName: "Derya",
      authorRole: "yonetici",
      body: "iç not: rengi biraz koyulaştır",
      status: "none",
    }),
    ctx(plan.id),
  );
  await addComment(
    j(`/api/plans/${plan.id}/comments`, "POST", {
      itemId,
      stage: "brand",
      authorName: "Marka",
      authorRole: "marka",
      body: "bunu beğendik",
      status: "none",
    }),
    ctx(plan.id),
  );
  await addAnnotation(
    j(`/api/plans/${plan.id}/annotations`, "POST", {
      itemId,
      mediaIndex: 0,
      xPct: 10,
      yPct: 10,
      note: "iç işaret: logoyu büyüt",
      stage: "internal",
      authorName: "Derya",
    }),
    ctx(plan.id),
  );
  await addAnnotation(
    j(`/api/plans/${plan.id}/annotations`, "POST", {
      itemId,
      mediaIndex: 0,
      xPct: 20,
      yPct: 20,
      note: "marka işareti: burası açık kalsın",
      stage: "brand",
      authorName: "Marka",
    }),
    ctx(plan.id),
  );

  // needs a publicToken to render the brand page at all
  await setStage(
    j(`/api/plans/${plan.id}/stage`, "POST", { to: "ic_onayda", actorName: "Derya", actorRole: "yonetici" }),
    ctx(plan.id),
  );
  await setStage(
    j(`/api/plans/${plan.id}/stage`, "POST", { to: "markaya_hazir", actorName: "Derya", actorRole: "yonetici" }),
    ctx(plan.id),
  );
  const afterMarkada = await setStage(
    j(`/api/plans/${plan.id}/stage`, "POST", { to: "markada", actorName: "Derya", actorRole: "yonetici" }),
    ctx(plan.id),
  );
  const { publicToken, internalToken } = await afterMarkada.json();
  return { publicToken, internalToken };
}

describe("internal review notes never reach the brand page", () => {
  it("filters the /c/[token] page's own props down to brand-stage comments and annotations", async () => {
    const { publicToken } = await seedPlanWithBothStageFeedback();
    const el = await BrandCalendarPage({ params: Promise.resolve({ token: publicToken }) });
    const { comments, annotations } = clientProps(el as ReactElement);

    expect(comments).toHaveLength(1);
    expect((comments[0] as { body: string }).body).toBe("bunu beğendik");
    expect(annotations).toHaveLength(1);
    expect((annotations[0] as { note: string }).note).toBe("marka işareti: burası açık kalsın");
  });

  it("the /i/[token] internal page still sees both stages — the team needs the full picture", async () => {
    const { internalToken } = await seedPlanWithBothStageFeedback();
    const el = await InternalPreviewPage({ params: Promise.resolve({ token: internalToken }) });
    const { comments, annotations } = clientProps(el as ReactElement);

    expect(comments).toHaveLength(2);
    expect(annotations).toHaveLength(2);
  });
});
