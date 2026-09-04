import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { GenerateProgress } from "@/components/team/GenerateProgress";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("GenerateProgress", () => {
  it("starts low and shows a countdown, then climbs as time passes", () => {
    render(<GenerateProgress estimatedMs={10000} />);
    expect(screen.getByText(/sn kaldı/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText(/%50/)).toBeInTheDocument();
  });

  it("caps near-complete rather than claiming 100% before the response arrives", () => {
    render(<GenerateProgress estimatedMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(5000); // well past the estimate
    });
    expect(screen.getByText(/%96/)).toBeInTheDocument();
    expect(screen.getByText(/neredeyse bitti…/)).toBeInTheDocument();
  });
});
