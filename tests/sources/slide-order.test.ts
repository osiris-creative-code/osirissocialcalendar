import { describe, it, expect } from "vitest";
import { isCarouselName, slideOrderFromName } from "@/lib/sources/slide-order";

describe("slideOrderFromName", () => {
  it.each([
    ["post-kaydirmali 2.jpg", 2],
    ["ELIT kaydırmalı 1.png", 1],
    ["story_03.png", 3],
    ["hero.jpg", null],
    ["reel.mp4", null],
  ])("%s -> %s", (name, expected) => {
    expect(slideOrderFromName(name as string)).toBe(expected);
  });
});

describe("isCarouselName", () => {
  it("accepts the documented kaydırmalı convention", () => {
    expect(isCarouselName("post-kaydirmali 2.jpg")).toBe(true);
    expect(isCarouselName("kaydırmalı 1.png")).toBe(true);
  });

  it("does not treat camera numbering as a carousel", () => {
    // A whole shoot of IMG_2201…IMG_2260 used to weld itself into one post.
    expect(isCarouselName("IMG_2201.jpg")).toBe(false);
    expect(isCarouselName("DSC_0900.jpg")).toBe(false);
    expect(isCarouselName("story_03.png")).toBe(false);
  });
});
