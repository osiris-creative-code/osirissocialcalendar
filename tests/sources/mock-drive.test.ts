import { describe, it, expect } from "vitest";
import { MockDriveSource } from "@/lib/sources/mock-drive";

describe("MockDriveSource", () => {
  it("returns the requested counts and pairs carousel assets", async () => {
    const assets = await new MockDriveSource({ postCount: 4, storyCount: 2, reelCount: 1 }).list();
    expect(assets.filter((a) => a.type === "post")).toHaveLength(4);
    expect(assets.filter((a) => a.type === "story")).toHaveLength(2);
    expect(assets.filter((a) => a.type === "reel")).toHaveLength(1);

    const g = assets.find((a) => a.type === "post")!.slideGroup;
    expect(assets.filter((a) => a.slideGroup === g).length).toBeGreaterThanOrEqual(2);
  });

  it("reel assets are videos", async () => {
    const assets = await new MockDriveSource({ reelCount: 2 }).list();
    expect(assets.filter((a) => a.type === "reel").every((a) => a.kind === "video")).toBe(true);
  });

  it("is deterministic", async () => {
    const a = await new MockDriveSource({ postCount: 3 }).list();
    const b = await new MockDriveSource({ postCount: 3 }).list();
    expect(a).toEqual(b);
  });
});
