import { describe, it, expect, vi, afterEach } from "vitest";
import { parseDriveFolderId, DriveFolderSource } from "@/lib/sources/drive-folder";

afterEach(() => vi.unstubAllGlobals());

describe("parseDriveFolderId", () => {
  it("reads the /folders/<id> form", () => {
    expect(
      parseDriveFolderId("https://drive.google.com/drive/folders/1AbC-dEf_ghIJKlmnOPqrstUvwx?usp=sharing"),
    ).toBe("1AbC-dEf_ghIJKlmnOPqrstUvwx");
  });
  it("reads the ?id=<id> form", () => {
    expect(parseDriveFolderId("https://drive.google.com/open?id=1ZZZ_aaaa_bbbb_cccc_dddd")).toBe(
      "1ZZZ_aaaa_bbbb_cccc_dddd",
    );
  });
  it("accepts a bare id", () => {
    expect(parseDriveFolderId("1ZZZ_aaaa_bbbb_cccc_dddd_eeee")).toBe("1ZZZ_aaaa_bbbb_cccc_dddd_eeee");
  });
  it("rejects junk", () => {
    expect(parseDriveFolderId("https://example.com/nope")).toBeNull();
  });
});

describe("DriveFolderSource.list", () => {
  it("paginates and maps names to types + slide order", async () => {
    const pages = [
      {
        nextPageToken: "p2",
        files: [
          { id: "a", name: "post-kaydirmali 1.jpg", mimeType: "image/jpeg" },
          { id: "b", name: "post-kaydirmali 2.jpg", mimeType: "image/jpeg" },
        ],
      },
      {
        files: [
          { id: "c", name: "reel_1.mp4", mimeType: "video/mp4" },
          { id: "d", name: "notes.txt", mimeType: "text/plain" },
        ],
      },
    ];
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => pages[call++] }) as unknown as Response),
    );

    const assets = await new DriveFolderSource("FOLDER", "KEY").list();
    expect(assets.map((a) => a.name)).toEqual([
      "post-kaydirmali 1.jpg",
      "post-kaydirmali 2.jpg",
      "reel_1.mp4",
    ]);
    expect(assets[0]).toMatchObject({ type: "post", kind: "image", slideOrder: 1 });
    expect(assets[1]).toMatchObject({ type: "post", slideOrder: 2 });
    expect(assets[2]).toMatchObject({ type: "reel", kind: "video" });
    expect(assets[0].url).toContain("alt=media");
  });
});
