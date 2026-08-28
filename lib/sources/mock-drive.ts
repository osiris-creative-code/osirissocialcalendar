import type { Asset, Source } from "./types";
import { slideOrderFromName } from "./slide-order";

export type MockDriveConfig = {
  postCount?: number;
  storyCount?: number;
  reelCount?: number;
};

const PH = (n: number) => `/demo/ph-${((n % 5) + 5) % 5 || 5}.svg`;

/** Deterministic fake Drive source. Post assets are paired into carousels. */
export class MockDriveSource implements Source {
  constructor(private config: MockDriveConfig = {}) {}

  async list(): Promise<Asset[]> {
    const { postCount = 5, storyCount = 6, reelCount = 2 } = this.config;
    const assets: Asset[] = [];

    for (let i = 0; i < postCount; i++) {
      const group = Math.floor(i / 2) + 1;
      const order = (i % 2) + 1;
      const name = `post-kaydirmali ${order}.jpg`;
      assets.push({
        id: `post-${i + 1}`,
        name,
        type: "post",
        kind: "image",
        url: PH(i + 1),
        slideGroup: `g${group}`,
        slideOrder: slideOrderFromName(name) ?? order,
      });
    }

    for (let i = 0; i < storyCount; i++) {
      const name = `story_${String(i + 1).padStart(2, "0")}.jpg`;
      assets.push({
        id: `story-${i + 1}`,
        name,
        type: "story",
        kind: "image",
        url: PH(i + 2),
        slideOrder: slideOrderFromName(name) ?? 1,
      });
    }

    for (let i = 0; i < reelCount; i++) {
      assets.push({
        id: `reel-${i + 1}`,
        name: `reel_${i + 1}.mp4`,
        type: "reel",
        kind: "video",
        url: PH(i + 5),
        slideOrder: 1,
      });
    }

    return assets;
  }
}
