import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarView } from "@/components/calendar/CalendarView";
import type { Brand, PlanItem } from "@/lib/types";

const brand = {
  id: "b",
  name: "Pablo",
  logoUrl: "/demo/ph-1.svg",
  colorPrimary: "#2E2A26",
  colorAccent: "#C6963C",
} as Brand;

const items: PlanItem[] = [
  {
    id: "i1",
    planId: "p",
    date: "2026-09-01",
    type: "post",
    sort: 0,
    caption: "Merhaba",
    specialLabel: null,
    media: [{ url: "/demo/ph-1.svg", kind: "image", slideOrder: 1 }],
    isGap: false,
    hidden: false,
    publishedAt: null,
  },
  {
    id: "i2",
    planId: "p",
    date: "2026-09-02",
    type: "story",
    sort: 1,
    caption: null,
    specialLabel: null,
    media: [{ url: "/demo/ph-2.svg", kind: "image", slideOrder: 1 }],
    isGap: false,
    hidden: false,
    publishedAt: null,
  },
];

function renderView(overrides = {}) {
  const props = {
    plan: { id: "p", title: "Eylül" },
    brand,
    items,
    mode: "brand" as const,
    comments: [],
    annotations: [],
    onComment: vi.fn(),
    onAnnotate: vi.fn(),
    onDeleteAnnotation: vi.fn(),
    onStatus: vi.fn(),
    ...overrides,
  };
  render(<CalendarView {...props} />);
  return props;
}

describe("CalendarView", () => {
  it("shows a caption for post, a story strip, and fires onStatus", () => {
    const { onStatus } = renderView();
    expect(screen.getByText("Merhaba")).toBeInTheDocument();
    expect(screen.getByText("Story akışı")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Onayla/ })[0]);
    expect(onStatus).toHaveBeenCalledWith("i1", "approved");
  });

  it("toggles between Izgara and Zaman çizelgesi", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Zaman çizelgesi" }));
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("timeline groups same-day items under one date header, not one per item", () => {
    renderView({
      items: [
        items[0], // post, 2026-09-01
        { ...items[1], id: "i2b", date: "2026-09-01" }, // story, same day
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "Zaman çizelgesi" }));
    expect(screen.getAllByText("01")).toHaveLength(1);
  });

  it("timeline 'Kompakt' switches to a multi-column grid", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Zaman çizelgesi" }));
    fireEvent.click(screen.getByRole("button", { name: /Kompakt/ }));
    expect(screen.getByRole("button", { name: /Kompakt/ })).toHaveClass("bg-[var(--brand)]");
  });

  it("doesn't put a pin layer over a reel — clicks must reach the player", () => {
    renderView({
      items: [
        {
          id: "i3",
          planId: "p",
          date: "2026-09-03",
          type: "reel" as const,
          sort: 2,
          caption: "Bir reel",
          specialLabel: null,
          media: [{ url: "https://cdn/x/reel.mp4", kind: "video" as const, slideOrder: 1 }],
          isGap: false,
          hidden: false,
          publishedAt: null,
        },
      ],
    });
    expect(screen.queryByTestId("pin-layer")).not.toBeInTheDocument();
  });

  it("still puts a pin layer over an image post", () => {
    renderView();
    expect(screen.getAllByTestId("pin-layer").length).toBeGreaterThan(0);
  });

  it("never renders gap items", () => {
    renderView({
      items: [
        ...items,
        {
          id: "gap1",
          planId: "p",
          date: "2026-09-03",
          type: "post" as const,
          sort: 2,
          caption: null,
          specialLabel: null,
          media: [],
          isGap: true,
          hidden: false,
        },
      ],
    });
    expect(screen.queryByText("2026-09-03")).not.toBeInTheDocument();
  });
});
