import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Carousel } from "@/components/calendar/Carousel";
import type { Media } from "@/lib/types";

const media: Media[] = [
  { url: "/a.jpg", kind: "image", slideOrder: 1 },
  { url: "/b.jpg", kind: "image", slideOrder: 2 },
  { url: "/c.jpg", kind: "image", slideOrder: 3 },
];

function pointer(
  type: "pointerdown" | "pointermove" | "pointerup",
  opts: { clientX: number; clientY?: number; pointerType?: string },
) {
  return new PointerEvent(type, {
    bubbles: true,
    clientX: opts.clientX,
    clientY: opts.clientY ?? 0,
    pointerType: opts.pointerType ?? "touch",
  });
}

describe("Carousel", () => {
  it("shows arrow buttons and dots when there is more than one slide", () => {
    render(<Carousel media={media} />);
    expect(screen.getByRole("button", { name: "Önceki" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sonraki" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /slayta git/ })).toHaveLength(3);
  });

  it("hides navigation for a single slide", () => {
    render(<Carousel media={[media[0]]} />);
    expect(screen.queryByRole("button", { name: "Sonraki" })).not.toBeInTheDocument();
  });

  it("advances on arrow click, the desktop interaction", () => {
    const onIndexChange = vi.fn();
    render(<Carousel media={media} onIndexChange={onIndexChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Sonraki" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("wraps from the last slide back to the first", () => {
    const onIndexChange = vi.fn();
    render(<Carousel media={media} onIndexChange={onIndexChange} />);
    const next = screen.getByRole("button", { name: "Sonraki" });
    fireEvent.click(next);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it("advances on a touch swipe past the threshold, the mobile interaction", () => {
    const onIndexChange = vi.fn();
    const { container } = render(<Carousel media={media} onIndexChange={onIndexChange} />);
    const frame = container.querySelector('[role="group"]')!;
    Object.defineProperty(frame, "clientWidth", { value: 300, configurable: true });

    fireEvent(frame, pointer("pointerdown", { clientX: 250 }));
    fireEvent(frame, pointer("pointermove", { clientX: 100 })); // 150px left, > 18% of 300px
    fireEvent(frame, pointer("pointerup", { clientX: 100 }));

    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("wraps from the last slide back to the first on a forward swipe, same as the arrow", () => {
    const onIndexChange = vi.fn();
    const { container } = render(<Carousel media={media} onIndexChange={onIndexChange} />);
    const frame = container.querySelector('[role="group"]')!;
    Object.defineProperty(frame, "clientWidth", { value: 300, configurable: true });

    fireEvent.click(screen.getByRole("button", { name: "Sonraki" }));
    fireEvent.click(screen.getByRole("button", { name: "Sonraki" })); // now on the last slide (index 2)
    onIndexChange.mockClear();

    fireEvent(frame, pointer("pointerdown", { clientX: 250 }));
    fireEvent(frame, pointer("pointermove", { clientX: 100 })); // swipe forward past the last slide
    fireEvent(frame, pointer("pointerup", { clientX: 100 }));

    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it("does not change slides on a swipe that falls short of the threshold", () => {
    const onIndexChange = vi.fn();
    const { container } = render(<Carousel media={media} onIndexChange={onIndexChange} />);
    const frame = container.querySelector('[role="group"]')!;
    Object.defineProperty(frame, "clientWidth", { value: 300, configurable: true });

    fireEvent(frame, pointer("pointerdown", { clientX: 200 }));
    fireEvent(frame, pointer("pointermove", { clientX: 180 })); // 20px, well under threshold
    fireEvent(frame, pointer("pointerup", { clientX: 180 }));

    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("ignores mouse drags — the desktop interaction is the arrow buttons", () => {
    const onIndexChange = vi.fn();
    const { container } = render(<Carousel media={media} onIndexChange={onIndexChange} />);
    const frame = container.querySelector('[role="group"]')!;
    Object.defineProperty(frame, "clientWidth", { value: 300, configurable: true });

    fireEvent(frame, pointer("pointerdown", { clientX: 250, pointerType: "mouse" }));
    fireEvent(frame, pointer("pointermove", { clientX: 50, pointerType: "mouse" }));
    fireEvent(frame, pointer("pointerup", { clientX: 50, pointerType: "mouse" }));

    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("supports left/right arrow keys", () => {
    const onIndexChange = vi.fn();
    render(<Carousel media={media} onIndexChange={onIndexChange} />);
    const frame = screen.getByRole("group");
    fireEvent.keyDown(frame, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledWith(1);
    fireEvent.keyDown(frame, { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it("jumps directly to a slide when its dot is clicked", () => {
    const onIndexChange = vi.fn();
    render(<Carousel media={media} onIndexChange={onIndexChange} />);
    fireEvent.click(screen.getAllByRole("button", { name: /slayta git/ })[2]);
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });
});
