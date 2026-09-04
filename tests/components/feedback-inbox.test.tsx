import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedbackInbox } from "@/components/team/FeedbackInbox";
import type { Annotation, Comment, PlanItem } from "@/lib/types";

const item: PlanItem = {
  id: "i1",
  planId: "p",
  date: "2026-09-05",
  type: "post",
  sort: 0,
  caption: "A",
  specialLabel: null,
  media: [],
  isGap: false,
  hidden: false,
  publishedAt: null,
};

const comments: Comment[] = [
  {
    id: "c1",
    planItemId: "i1",
    stage: "internal",
    authorName: "Mert",
    authorRole: "onaylayan",
    body: "notlara bakalım",
    status: "changes",
    createdAt: "2026-09-05T00:00:00Z",
  },
];
const annotations: Annotation[] = [];

describe("FeedbackInbox", () => {
  it("jumps to the item when an entry with onJump is clicked", () => {
    const onJump = vi.fn();
    render(
      <FeedbackInbox comments={comments} annotations={annotations} items={[item]} onJump={onJump} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /5 Eylül · POST/ }));
    expect(onJump).toHaveBeenCalledWith("i1", { pin: false });
  });

  it("asks for the marked-up image when the entry is a pin note", () => {
    const onJump = vi.fn();
    const pin: Annotation = {
      id: "an1",
      planItemId: "i1",
      mediaIndex: 0,
      xPct: 20,
      yPct: 40,
      note: "burayı büyüt",
      stage: "brand",
      authorName: "Marka",
      createdAt: "2026-09-05T00:00:00Z",
    };
    render(<FeedbackInbox comments={[]} annotations={[pin]} items={[item]} onJump={onJump} />);
    fireEvent.click(screen.getByRole("button", { name: "görselde göster" }));
    expect(onJump).toHaveBeenCalledWith("i1", { pin: true });
  });

  it("renders plain text (no button) when onJump isn't given", () => {
    render(<FeedbackInbox comments={comments} annotations={annotations} items={[item]} />);
    expect(screen.queryByRole("button", { name: /5 Eylül/ })).not.toBeInTheDocument();
    expect(screen.getByText(/5 Eylül · POST/)).toBeInTheDocument();
  });

  it("shows the comment body and author regardless", () => {
    render(<FeedbackInbox comments={comments} annotations={annotations} items={[item]} />);
    expect(screen.getByText(/notlara bakalım/)).toBeInTheDocument();
    expect(screen.getByText("Mert")).toBeInTheDocument();
  });
});
