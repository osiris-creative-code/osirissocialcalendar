import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PinLayer } from "@/components/calendar/PinLayer";

function stubRect(el: Element, rect: Partial<DOMRect>) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 300,
    height: 400,
    right: 300,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => "",
    ...rect,
  } as DOMRect);
}

describe("PinLayer — note popover stays inside the frame", () => {
  it("clamps the popover's left offset so it can't spill past the frame's edges", () => {
    const { container } = render(
      <PinLayer annotations={[]} mediaIndex={0} onAdd={vi.fn()} onDelete={vi.fn()} />,
    );
    const layer = screen.getByTestId("pin-layer");
    stubRect(layer, { width: 300, height: 400 });

    // Click 2px from the left edge — the old fixed `left: x%` positioning put
    // the 208px-wide popover mostly off-frame here, and the frame's own
    // overflow-hidden cut it in half instead of just showing it moved.
    fireEvent.click(layer, { clientX: 2, clientY: 200 });

    const popover = container.querySelector('textarea[aria-label="Düzeltme notu"]')!
      .parentElement as HTMLElement;
    // jsdom's CSSOM drops the redundant calc() wrapper inside clamp()'s
    // arguments when it serializes the style — the value is equivalent, this
    // is just how it comes back out of `.style.left` here, not in a real browser.
    expect(popover.style.left).toContain("clamp(104px,");
    expect(popover.style.left).toContain("100% - 104px");
  });

  it("clamps the popover's top offset too, so a pin near the bottom doesn't push it off-frame", () => {
    const { container } = render(
      <PinLayer annotations={[]} mediaIndex={0} onAdd={vi.fn()} onDelete={vi.fn()} />,
    );
    const layer = screen.getByTestId("pin-layer");
    stubRect(layer, { width: 300, height: 400 });

    fireEvent.click(layer, { clientX: 150, clientY: 396 }); // 99% down

    const popover = container.querySelector('textarea[aria-label="Düzeltme notu"]')!
      .parentElement as HTMLElement;
    expect(popover.style.top).toContain("clamp(0px,");
    expect(popover.style.top).toContain("100% - 120px");
  });
});
