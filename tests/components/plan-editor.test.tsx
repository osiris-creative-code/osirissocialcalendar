import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanEditor } from "@/components/team/PlanEditor";
import type { Annotation, Plan, PlanItem } from "@/lib/types";

const plan = { id: "p", theme: { primary: "#000000", accent: "#111111" } } as Plan;

const items: PlanItem[] = [
  { id: "i1", planId: "p", date: "2026-09-01", type: "post", sort: 0, caption: "A", specialLabel: null, media: [{ url: "/img1.jpg", kind: "image", slideOrder: 1 }], isGap: false, hidden: false, publishedAt: null },
  { id: "i2", planId: "p", date: "2026-09-02", type: "post", sort: 1, caption: "B", specialLabel: null, media: [], isGap: false, hidden: false, publishedAt: null },
];

describe("PlanEditor", () => {
  it("shows a dash instead of a caption editor for story rows", () => {
    render(
      <PlanEditor
        plan={plan}
        items={[{ ...items[0], type: "story", caption: null }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("emits a theme change", () => {
    const onThemeChange = vi.fn();
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} onThemeChange={onThemeChange} />);
    fireEvent.input(screen.getByLabelText("Vurgu"), { target: { value: "#abcdef" } });
    expect(onThemeChange).toHaveBeenCalledWith({ primary: "#000000", accent: "#abcdef" });
  });

  it("gives each row a stable id and rings the highlighted one", () => {
    const { container } = render(
      <PlanEditor plan={plan} items={items} onChange={vi.fn()} highlightItemId="i2" />,
    );
    expect(container.querySelector("#plan-item-i1")).toBeInTheDocument();
    expect(container.querySelector("#plan-item-i1")).not.toHaveClass("ring-2");
    expect(container.querySelector("#plan-item-i2")).toHaveClass("ring-2");
  });

  it("groups rows under one heading per day and gives each a drag handle", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    expect(screen.getByText("1 Eylül")).toBeInTheDocument();
    expect(screen.getByText("2 Eylül")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sürükle" })).toHaveLength(2);
  });

  it("does not emit while typing a caption — only on blur", () => {
    const onChange = vi.fn();
    render(<PlanEditor plan={plan} items={items} onChange={onChange} />);
    const box = screen.getAllByLabelText("POST açıklaması")[0];

    fireEvent.change(box, { target: { value: "yeni metin" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(box);
    const emitted = onChange.mock.calls.at(-1)![0] as PlanItem[];
    expect(emitted.find((i) => i.id === "i1")!.caption).toBe("yeni metin");
  });

  it("shows a pin marker at xPct/yPct on the right image, with its note", () => {
    const annotations: Annotation[] = [
      {
        id: "a1",
        planItemId: "i1",
        mediaIndex: 0,
        xPct: 30,
        yPct: 70,
        note: "logo çok küçük",
        stage: "brand",
        authorName: "Marka",
        createdAt: "2026-09-01T00:00:00Z",
      },
    ];
    const { container } = render(
      <PlanEditor plan={plan} items={items} onChange={vi.fn()} annotations={annotations} />,
    );
    expect(screen.getByText("logo çok küçük")).toBeInTheDocument();
    const pin = container.querySelector('span[title="logo çok küçük"]') as HTMLElement;
    expect(pin.style.left).toBe("30%");
    expect(pin.style.top).toBe("70%");
  });

  it("opens the enlarged pinned image when the thumbnail is clicked", () => {
    const annotations: Annotation[] = [
      {
        id: "a1",
        planItemId: "i1",
        mediaIndex: 0,
        xPct: 10,
        yPct: 20,
        note: "burayı değiştir",
        stage: "brand",
        authorName: "Marka",
        createdAt: "2026-09-01T00:00:00Z",
      },
    ];
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} annotations={annotations} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "İşaretli görseli büyüt" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByTestId("lightbox-pin")).toHaveLength(1);
  });
});
