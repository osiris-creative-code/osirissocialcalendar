import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL = { url: process.env.INSTAGRAM_API_URL, key: process.env.INSTAGRAM_API_KEY };

describe("fetchFeed", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    process.env.INSTAGRAM_API_URL = ORIGINAL.url;
    process.env.INSTAGRAM_API_KEY = ORIGINAL.key;
    vi.unstubAllGlobals();
  });

  it("rejects an empty handle without hitting the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { fetchFeed } = await import("@/lib/instagram");
    expect(await fetchFeed("  ")).toEqual({ ok: false, reason: "no-handle" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the configured provider and digs the image urls out of its shape", async () => {
    process.env.INSTAGRAM_API_URL = "https://api.example.com/user/{handle}";
    process.env.INSTAGRAM_API_KEY = "k";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("https://api.example.com/user/rafine");
        return {
          ok: true,
          json: async () => ({ data: { items: [{ image: "https://cdn/x.jpg" }] } }),
        };
      }),
    );
    const { fetchFeed } = await import("@/lib/instagram");
    const res = await fetchFeed("@rafine");
    expect(res).toMatchObject({ ok: true, via: "provider" });
  });

  it("reports the block instead of throwing when nothing works", async () => {
    delete process.env.INSTAGRAM_API_URL;
    delete process.env.INSTAGRAM_API_KEY;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    const { fetchFeed } = await import("@/lib/instagram");
    expect(await fetchFeed("rafine")).toEqual({ ok: false, reason: "blocked" });
  });
});
