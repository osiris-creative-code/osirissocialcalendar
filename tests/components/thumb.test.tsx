import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Thumb } from "@/components/ui/Thumb";
import type { Media } from "@/lib/types";

describe("Thumb", () => {
  it("uses the plain url for an image", () => {
    const media: Media = { url: "/a.jpg", kind: "image", slideOrder: 1 };
    render(<Thumb media={media} alt="x" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/a.jpg");
  });

  it("never puts a video/iframe url in an <img> — this was a guaranteed broken thumbnail", () => {
    const reel: Media = { url: "https://drive.google.com/file/d/abc/preview", kind: "video", slideOrder: 1 };
    render(<Thumb media={reel} alt="x" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Görsel yok")).toBeInTheDocument();
  });

  it("uses the poster for a video that has one", () => {
    const reel: Media = {
      url: "https://drive.google.com/file/d/abc/preview",
      kind: "video",
      slideOrder: 1,
      posterUrl: "https://drive.google.com/thumbnail?id=abc",
    };
    render(<Thumb media={reel} alt="x" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://drive.google.com/thumbnail?id=abc");
  });

  it("shows a plain placeholder, not a broken-image icon, when there is nothing to show", () => {
    render(<Thumb media={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Görsel yok")).toBeInTheDocument();
  });

  it("retries once with a cache-busting param on a load failure, then falls back", () => {
    const media: Media = { url: "/flaky.jpg", kind: "image", slideOrder: 1 };
    render(<Thumb media={media} alt="x" />);

    fireEvent.error(screen.getByRole("img"));
    const retried = screen.getByRole("img");
    expect(retried).toHaveAttribute("src", "/flaky.jpg?retry=1");

    fireEvent.error(retried);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Görsel yüklenemedi")).toBeInTheDocument();
  });

  it("recovers from a load failure if the retry succeeds — no error event fires", () => {
    const media: Media = { url: "/flaky.jpg", kind: "image", slideOrder: 1 };
    render(<Thumb media={media} alt="x" />);
    fireEvent.error(screen.getByRole("img"));
    // The retry rendered — never firing another error means it loaded fine.
    expect(screen.getByRole("img")).toHaveAttribute("src", "/flaky.jpg?retry=1");
  });
});
