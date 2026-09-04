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
  caption: "Eski açıklama",
  specialLabel: null,
  media: [{ url: "/img.jpg", kind: "image", slideOrder: 1 }],
  isGap: false,
  hidden: false,
  publishedAt: null,
};

const comment: Comment = {
  id: "c1",
  planItemId: "i1",
  stage: "internal",
  authorName: "Mert",
  authorRole: "onaylayan",
  body: "notlara bakalım",
  status: "changes",
  createdAt: "2026-09-05T00:00:00Z",
};

const pin: Annotation = {
  id: "a1",
  planItemId: "i1",
  mediaIndex: 0,
  xPct: 20,
  yPct: 40,
  note: "marul çıksın",
  stage: "brand",
  authorName: "İrem",
  createdAt: "2026-09-05T00:00:00Z",
};

const openDetail = () => fireEvent.click(screen.getByRole("button", { name: /5 Eylül Post/ }));

describe("FeedbackInbox", () => {
  it("shows one thumbnail per item with feedback, counting the notes", () => {
    render(<FeedbackInbox comments={[comment]} annotations={[pin]} items={[item]} />);
    expect(screen.getByRole("button", { name: /5 Eylül Post/ })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("says so plainly when there is nothing to review", () => {
    render(<FeedbackInbox comments={[]} annotations={[]} items={[item]} />);
    expect(screen.getByText("Henüz yorum yok.")).toBeInTheDocument();
  });

  it("opens the image with its pins and every note", () => {
    render(<FeedbackInbox comments={[comment]} annotations={[pin]} items={[item]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openDetail();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByTestId("feedback-pin")).toHaveLength(1);
    expect(screen.getByText(/marul çıksın/)).toBeInTheDocument();
    expect(screen.getByText(/notlara bakalım/)).toBeInTheDocument();
  });

  it("reveals a pin's note on hover", () => {
    render(<FeedbackInbox comments={[]} annotations={[pin]} items={[item]} />);
    openDetail();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Not 1" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("marul çıksın");
  });

  it("edits the caption without leaving the panel", () => {
    const onCaption = vi.fn();
    render(
      <FeedbackInbox comments={[comment]} annotations={[]} items={[item]} onCaption={onCaption} />,
    );
    openDetail();
    fireEvent.click(screen.getByRole("button", { name: "düzenle" }));
    fireEvent.change(screen.getByLabelText("Açıklama"), { target: { value: "Yeni açıklama" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(onCaption).toHaveBeenCalledWith("i1", "Yeni açıklama");
  });

  it("offers a jump to the calendar, flagging that it has pins", () => {
    const onJump = vi.fn();
    render(<FeedbackInbox comments={[]} annotations={[pin]} items={[item]} onJump={onJump} />);
    openDetail();
    fireEvent.click(screen.getByRole("button", { name: /takvimde göster/ }));
    expect(onJump).toHaveBeenCalledWith("i1", { pin: true });
  });
});
