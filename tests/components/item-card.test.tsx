import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ItemCard } from "@/components/calendar/ItemCard";
import type { PlanItem } from "@/lib/types";

const base: PlanItem = {
  id: "i1",
  planId: "p",
  date: "2026-09-01",
  type: "post",
  sort: 0,
  caption: "A",
  specialLabel: null,
  media: [{ url: "/img1.jpg", kind: "image", slideOrder: 1 }],
  isGap: false,
  hidden: false,
  publishedAt: null,
};

const noop = { onComment: vi.fn(), onAnnotate: vi.fn(), onDeleteAnnotation: vi.fn(), onStatus: vi.fn() };

function frame(container: HTMLElement) {
  // The media frame is the direct child that carries the aspect-ratio class.
  return container.querySelector("article > div:nth-of-type(2)") as HTMLElement;
}

describe("ItemCard — media frame shape", () => {
  it("gives a post a 4:5 (feed) frame", () => {
    const { container } = render(<ItemCard item={base} annotations={[]} comments={[]} status="none" {...noop} />);
    expect(frame(container)).toHaveClass("aspect-[4/5]");
  });

  it("gives a reel a 9:16 (vertical) frame", () => {
    const { container } = render(
      <ItemCard item={{ ...base, type: "reel" }} annotations={[]} comments={[]} status="none" {...noop} />,
    );
    expect(frame(container)).toHaveClass("aspect-[9/16]");
  });

  // Stories are shot vertical too — a 4:5 box was cropping them the same way
  // as a feed post, which is wrong for a story.
  it("gives a story a 9:16 (vertical) frame, not the feed's 4:5", () => {
    const { container } = render(
      <ItemCard item={{ ...base, type: "story", caption: null }} annotations={[]} comments={[]} status="none" {...noop} />,
    );
    const el = frame(container);
    expect(el).toHaveClass("aspect-[9/16]");
    expect(el).not.toHaveClass("aspect-[4/5]");
  });
});
