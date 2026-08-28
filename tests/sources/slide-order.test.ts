import { describe, it, expect } from "vitest";
import { slideOrderFromName } from "@/lib/sources/slide-order";

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
