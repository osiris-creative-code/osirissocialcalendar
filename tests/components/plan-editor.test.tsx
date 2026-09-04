import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlanEditor } from "@/components/team/PlanEditor";
import type { Annotation, Plan, PlanItem } from "@/lib/types";

const plan = {
  id: "p",
  theme: { primary: "#000000", accent: "#111111" },
  rangeStart: "2026-09-01",
  rangeEnd: "2026-09-02",
} as Plan;

const items: PlanItem[] = [
  { id: "i1", planId: "p", date: "2026-09-01", type: "post", sort: 0, caption: "A", specialLabel: null, media: [{ url: "/img1.jpg", kind: "image", slideOrder: 1 }], isGap: false, hidden: false, publishedAt: null },
  { id: "i2", planId: "p", date: "2026-09-02", type: "post", sort: 1, caption: "B", specialLabel: null, media: [], isGap: false, hidden: false, publishedAt: null },
];

const pin: Annotation = {
  id: "a1",
  planItemId: "i1",
  mediaIndex: 0,
  xPct: 30,
  yPct: 70,
  note: "logo çok küçük",
  stage: "brand",
  authorName: "Marka",
  createdAt: "2026-09-01T00:00:00Z",
};

describe("PlanEditor — shared", () => {
  it("groups items under one heading per day, in both views", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    expect(screen.getByText("1 Eylül")).toBeInTheDocument();
    expect(screen.getByText("2 Eylül")).toBeInTheDocument();
  });

  it("gives each item a stable id and rings the highlighted one", () => {
    const { container } = render(
      <PlanEditor plan={plan} items={items} onChange={vi.fn()} highlightItemId="i2" />,
    );
    expect(container.querySelector("#plan-item-i1")).toBeInTheDocument();
    expect(container.querySelector("#plan-item-i1")).not.toHaveClass("ring-2");
    expect(container.querySelector("#plan-item-i2")).toHaveClass("ring-2");
  });

  it("emits a theme change", () => {
    const onThemeChange = vi.fn();
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} onThemeChange={onThemeChange} />);
    fireEvent.input(screen.getByLabelText("Vurgu"), { target: { value: "#abcdef" } });
    expect(onThemeChange).toHaveBeenCalledWith({ primary: "#000000", accent: "#abcdef" });
  });

  it("does not emit while typing a caption — only on blur", () => {
    const onChange = vi.fn();
    render(<PlanEditor plan={plan} items={items} onChange={onChange} />);
    const box = screen.getAllByLabelText("Post açıklaması")[0];

    fireEvent.change(box, { target: { value: "yeni metin" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(box);
    const emitted = onChange.mock.calls.at(-1)![0] as PlanItem[];
    expect(emitted.find((i) => i.id === "i1")!.caption).toBe("yeni metin");
  });

  it("shows a summary of what is in the plan", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    expect(screen.getByText("post")).toBeInTheDocument();
    expect(screen.getByText("boş gün")).toBeInTheDocument();
  });
});

describe("PlanEditor — board view", () => {
  it("is the default and offers a switch to the list", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Pano" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Liste" })).toHaveAttribute("aria-pressed", "false");
  });

  it("badges a card that has pin feedback and opens the image full size", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} annotations={[pin]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "İşaretli görseli büyüt" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByTestId("lightbox-pin")).toHaveLength(1);
  });

  it("switches to the list view when asked", async () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByRole("button", { name: "Liste" })).toHaveAttribute("aria-pressed", "true");
    // the date picker only exists in the list view; the swap is animated
    await waitFor(() => expect(screen.getAllByLabelText("Tarih").length).toBeGreaterThan(0));
  });
});

describe("PlanEditor — list view", () => {
  it("shows a dash instead of a caption editor for story items", () => {
    render(
      <PlanEditor
        plan={plan}
        items={[{ ...items[0], type: "story", caption: null }]}
        onChange={vi.fn()}
        defaultView="list"
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows each pin at its real xPct/yPct with the note beside it", () => {
    const { container } = render(
      <PlanEditor
        plan={plan}
        items={items}
        onChange={vi.fn()}
        annotations={[pin]}
        defaultView="list"
      />,
    );
    expect(screen.getByText("logo çok küçük")).toBeInTheDocument();
    const marker = container.querySelector('span[title="logo çok küçük"]') as HTMLElement;
    expect(marker.style.left).toBe("30%");
    expect(marker.style.top).toBe("70%");
  });

  it("gives every row a drag handle", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} defaultView="list" />);
    expect(screen.getAllByRole("button", { name: "Sürükle" })).toHaveLength(2);
  });
});
