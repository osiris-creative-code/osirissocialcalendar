import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReelPlayer } from "@/components/calendar/ReelPlayer";
import type { Media } from "@/lib/types";

const video: Media = { url: "https://cdn.test/clip.mp4", kind: "video", slideOrder: 1 };

beforeEach(() => {
  // jsdom doesn't implement media playback — stub what our controls call.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

describe("ReelPlayer — a real uploaded video", () => {
  it("does not use the browser's native control bar", () => {
    const { container } = render(<ReelPlayer media={video} />);
    expect(container.querySelector("video")).not.toHaveAttribute("controls");
  });

  it("shows a tap-to-play button until playback starts", () => {
    render(<ReelPlayer media={video} />);
    const playBtn = screen.getByRole("button", { name: "Oynat" });
    fireEvent.click(playBtn);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Oynat" })).not.toBeInTheDocument();
  });

  it("toggles mute without also toggling playback", () => {
    const { container } = render(<ReelPlayer media={video} />);
    const muteBtn = screen.getByRole("button", { name: "Sesi kapat" });
    fireEvent.click(muteBtn);
    expect(container.querySelector("video")).toHaveProperty("muted", true);
    expect(screen.getByRole("button", { name: "Sesi aç" })).toBeInTheDocument();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("offers a fullscreen control", () => {
    render(<ReelPlayer media={video} />);
    expect(screen.getByRole("button", { name: "Tam ekran" })).toBeInTheDocument();
  });
});
