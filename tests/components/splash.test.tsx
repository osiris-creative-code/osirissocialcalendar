import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Splash } from "@/components/Splash";

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Splash", () => {
  it("renders brand + title then calls onDone after the full delay", () => {
    const onDone = vi.fn();
    render(
      <Splash
        brandName="Pablo"
        logoUrl="/demo/ph-1.svg"
        colorPrimary="#2E2A26"
        title="28 Ağustos – 11 Eylül Sosyal Medya Paylaşım Takvimi"
        onDone={onDone}
        storageKey="ritim-splash-x"
      />,
    );
    expect(screen.getByText("Pablo")).toBeInTheDocument();
    expect(screen.getByText(/Sosyal Medya Paylaşım Takvimi/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3500 + 400);
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("is quick on a repeat visit", () => {
    sessionStorage.setItem("ritim-splash-x", "1");
    const onDone = vi.fn();
    render(
      <Splash
        brandName="Pablo"
        logoUrl="/demo/ph-1.svg"
        colorPrimary="#2E2A26"
        title="t"
        onDone={onDone}
        storageKey="ritim-splash-x"
      />,
    );
    act(() => {
      vi.advanceTimersByTime(800 + 400);
    });
    expect(onDone).toHaveBeenCalled();
  });
});
