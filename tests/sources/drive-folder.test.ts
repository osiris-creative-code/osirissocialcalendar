import { describe, it, expect, vi, afterEach } from "vitest";
import { parseDriveFolderId, folderType, DriveFolderSource } from "@/lib/sources/drive-folder";

afterEach(() => vi.unstubAllGlobals());

describe("parseDriveFolderId", () => {
  it("reads the /folders/<id> form", () => {
    expect(
      parseDriveFolderId("https://drive.google.com/drive/folders/1AbC-dEf_ghIJKlmnOPqrstUvwx?usp=sharing"),
    ).toBe("1AbC-dEf_ghIJKlmnOPqrstUvwx");
  });
  it("reads the ?id=<id> form and a bare id", () => {
    expect(parseDriveFolderId("https://drive.google.com/open?id=1ZZZ_aaaa_bbbb_cccc_dddd")).toBe(
      "1ZZZ_aaaa_bbbb_cccc_dddd",
    );
    expect(parseDriveFolderId("1ZZZ_aaaa_bbbb_cccc_dddd_eeee")).toBe("1ZZZ_aaaa_bbbb_cccc_dddd_eeee");
  });
  it("rejects junk", () => {
    expect(parseDriveFolderId("https://example.com/nope")).toBeNull();
  });
});

describe("folderType", () => {
  it("maps folder names to slot types", () => {
    expect(folderType("POST")).toBe("post");
    expect(folderType("Story")).toBe("story");
    expect(folderType("REELS")).toBe("reel");
    expect(folderType("ERÇİ EK")).toBeNull();
    expect(folderType("CROP")).toBeNull();
  });
});

const FOLDER = "application/vnd.google-apps.folder";
const img = (name: string) => ({ id: name, name, mimeType: "image/jpeg" });
const vid = (name: string, mime = "video/mp4") => ({ id: name, name, mimeType: mime });
const dir = (id: string, name: string) => ({ id, name, mimeType: FOLDER });

// shoot tree
const TREE: Record<string, { files?: unknown[] }> = {
  ROOT: { files: [dir("P", "POST"), dir("S", "STORY"), dir("R", "REELS"), dir("C", "CROP"), dir("EK", "ERÇİ EK")] },
  P: { files: [img("post-b.jpg"), img("post-a.jpg"), dir("K1", "KAYDIRMALI 1"), dir("K2", "KAYDIRMALI 2")] },
  K1: { files: [img("2.jpg"), img("1.jpg")] },
  K2: { files: [img("a.jpg")] },
  S: { files: [img("s1.jpg"), { id: "s2", name: "s2.png", mimeType: "image/png" }] },
  R: { files: [vid("reel1.mp4"), vid("reel2.mov", "video/quicktime")] },
  C: { files: [img("crop1.jpg")] }, // must never be fetched
  EK: { files: [dir("EKS", "STORY")] },
  EKS: { files: [img("ek-story.jpg")] },
};

function stubDrive() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = decodeURIComponent(String(input).replace(/\+/g, " "));
      const m = /'([^']+)' in parents/.exec(url);
      const id = m?.[1] ?? "";
      if (id === "C") throw new Error("CROP folder should be skipped, not listed");
      return { ok: true, json: async () => TREE[id] ?? { files: [] } } as unknown as Response;
    }),
  );
}

describe("DriveFolderSource.list — recursive shoot folder", () => {
  it("classifies by folder, builds carousels, skips CROP, descends EK", async () => {
    stubDrive();
    const assets = await new DriveFolderSource("ROOT", "KEY").list();
    const byName = (n: string) => assets.find((a) => a.name === n);

    expect(assets).toHaveLength(10);
    expect(byName("crop1.jpg")).toBeUndefined();

    // single posts
    expect(byName("post-a.jpg")).toMatchObject({ type: "post", kind: "image" });
    expect(byName("post-a.jpg")!.slideGroup).toBeUndefined();

    // carousel K1: two slides, same group, ordered by natural name
    const s1 = byName("1.jpg")!;
    const s2 = byName("2.jpg")!;
    expect(s1.type).toBe("post");
    expect(s1.slideGroup).toBeTruthy();
    expect(s1.slideGroup).toBe(s2.slideGroup);
    expect([s1.slideOrder, s2.slideOrder]).toEqual([1, 2]);

    // carousel K2 has a different group
    expect(byName("a.jpg")!.slideGroup).not.toBe(s1.slideGroup);

    // stories + reels + EK story
    expect(byName("s2.png")).toMatchObject({ type: "story" });
    expect(byName("reel2.mov")).toMatchObject({ type: "reel", kind: "video" });
    expect(byName("ek-story.jpg")).toMatchObject({ type: "story" });

    // download url is the alt=media form
    expect(byName("post-a.jpg")!.url).toContain("alt=media");
  });
});
