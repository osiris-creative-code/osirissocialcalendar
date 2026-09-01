import { describe, it, expect } from "vitest";
import { isWebPlayableVideo } from "@/lib/media-format";

describe("isWebPlayableVideo", () => {
  it("flags container formats browsers usually can't play", () => {
    expect(isWebPlayableVideo("clip.mov")).toBe(false);
    expect(isWebPlayableVideo("SHOOT_final.MOV")).toBe(false);
    expect(isWebPlayableVideo("a.avi")).toBe(false);
    expect(isWebPlayableVideo("b.mkv")).toBe(false);
    expect(isWebPlayableVideo("video/quicktime")).toBe(false);
    expect(isWebPlayableVideo("video/x-msvideo")).toBe(false);
  });

  it("passes web-friendly formats", () => {
    expect(isWebPlayableVideo("reel.mp4")).toBe(true);
    expect(isWebPlayableVideo("clip.webm")).toBe(true);
    expect(isWebPlayableVideo("video/mp4")).toBe(true);
  });
});
