import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanEditor } from "@/components/team/PlanEditor";
import type { Plan, PlanItem } from "@/lib/types";

const plan = { id: "p", theme: { primary: "#000000", accent: "#111111" } } as Plan;

const items: PlanItem[] = [
  { id: "i1", planId: "p", date: "2026-09-01", type: "post", sort: 0, caption: "A", specialLabel: null, media: [], isGap: false, hidden: false, publishedAt: null },
  { id: "i2", planId: "p", date: "2026-09-02", type: "post", sort: 1, caption: "B", specialLabel: null, media: [], isGap: false, hidden: false, publishedAt: null },
];

describe("PlanEditor", () => {
  it("reorders rows with the down button and emits new order", () => {
    const onChange = vi.fn();
    render(<PlanEditor plan={plan} items={items} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Aşağı/ })[0]);
    const lastArg = onChange.mock.calls.at(-1)![0] as PlanItem[];
    expect(lastArg.map((i) => i.id)).toEqual(["i2", "i1"]);
  });

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
    expect(container.querySelector("#plan-item-i2")).toBeInTheDocument();
    expect(container.querySelector("#plan-item-i1")).not.toHaveClass("ring-2");
    expect(container.querySelector("#plan-item-i2")).toHaveClass("ring-2");
  });
});
