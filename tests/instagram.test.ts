import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWebProfile } from "@/lib/instagram";

afterEach(() => vi.unstubAllGlobals());

const ok = (body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response));

describe("fetchWebProfile", () => {
  it("pulls thumbnails + counts from a web_profile_info payload", async () => {
    ok({
      data: {
        user: {
          edge_followed_by: { count: 1234 },
          edge_owner_to_timeline_media: {
            count: 87,
            edges: [
              { node: { thumbnail_src: "https://cdn/a.jpg" } },
              { node: { display_url: "https://cdn/b.jpg" } },
            ],
          },
        },
      },
    });
    const p = await fetchWebProfile("@nasa");
    expect(p).toEqual({ thumbs: ["https://cdn/a.jpg", "https://cdn/b.jpg"], posts: 87, followers: 1234 });
  });

  it("returns null on the useragent-mismatch rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({ message: "useragent mismatch" }) }) as unknown as Response),
    );
    expect(await fetchWebProfile("nasa")).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network");
    }));
    expect(await fetchWebProfile("nasa")).toBeNull();
  });

  it("returns null when there are no posts", async () => {
    ok({ data: { user: { edge_owner_to_timeline_media: { edges: [] } } } });
    expect(await fetchWebProfile("nasa")).toBeNull();
  });
});
