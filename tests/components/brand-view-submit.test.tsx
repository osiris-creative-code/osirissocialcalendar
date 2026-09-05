import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrandViewClient } from "@/app/c/[token]/BrandViewClient";
import type { Brand, Plan, PlanItem } from "@/lib/types";

const plan = {
  id: "p1",
  brandId: "b1",
  title: "Eylül",
  rangeStart: "2026-09-01",
  rangeEnd: "2026-09-02",
  prompt: "her gun post",
  stage: "markada",
  theme: { primary: "#000000", accent: "#111111" },
  internalToken: "i_x",
  publicToken: "c_x",
  version: 1,
  lastActorName: null,
  createdAt: "2026-09-01T00:00:00Z",
  visionEnabled: false,
  feedInsights: null,
  reviseDeadline: null,
  mediaPurgedAt: null,
  driveFolderUrl: null,
  reelLinks: [],
} as Plan;

const brand = {
  id: "b1",
  name: "Deniz Cafe",
  logoUrl: "/logo.png",
  colorPrimary: "#7A4A2B",
  colorAccent: "#D9982F",
  instagramHandle: null,
  feedScreenshotUrl: null,
  phone: null,
  feedThumbs: null,
  feedFetchedAt: null,
  status: "active",
} as Brand;

const items: PlanItem[] = [
  {
    id: "i1",
    planId: "p1",
    date: "2026-09-01",
    type: "post",
    sort: 0,
    caption: "Merhaba",
    specialLabel: null,
    media: [{ url: "/img1.jpg", kind: "image", slideOrder: 1 }],
    isGap: false,
    hidden: false,
    publishedAt: null,
  },
];

function renderPastSplash() {
  // Splash holds for 3.5s unless it's already been seen this session (800ms) —
  // seed that so the test doesn't need a much longer fake-timer advance.
  sessionStorage.setItem(`ritim-splash-${plan.publicToken}`, "1");
  const utils = render(
    <BrandViewClient
      plan={plan}
      brand={brand}
      items={items}
      comments={[]}
      annotations={[]}
      splashTitle="Eylül Sosyal Medya Paylaşım Takvimi"
    />,
  );
  act(() => {
    vi.advanceTimersByTime(1300); // past the splash's own timers
  });
  return utils;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("BrandViewClient — approve vs. send-revisions are separate actions", () => {
  it("offers both an explicit approve button and a send-revisions button", () => {
    renderPastSplash();
    expect(screen.getByRole("button", { name: /Paylaşım Takvimini Onayla/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revizeleri gönder" })).toBeInTheDocument();
  });

  it("approve posts round: onay, regardless of per-item status", async () => {
    renderPastSplash();
    fireEvent.click(screen.getByRole("button", { name: /Paylaşım Takvimini Onayla/ }));
    await act(async () => {
      await Promise.resolve();
    });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/plans/p1/submit");
    expect(JSON.parse(call[1].body)).toMatchObject({ round: "onay" });
    expect(screen.getByText(/onaylandı/)).toBeInTheDocument();
  });

  it("send-revisions posts round: revize, never inferred from item statuses", async () => {
    renderPastSplash();
    fireEvent.click(screen.getByRole("button", { name: "Revizeleri gönder" }));
    await act(async () => {
      await Promise.resolve();
    });
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(call[1].body)).toMatchObject({ round: "revize" });
    expect(screen.getByText(/Revizeleriniz ekibe iletildi/)).toBeInTheDocument();
  });
});
