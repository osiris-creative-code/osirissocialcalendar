import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/uploads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/uploads")>();
  return { ...actual, putUpload: vi.fn(async ({ name }: { name: string }) => ({ url: `https://stored/${name}` })) };
});

import { GET as listBrands } from "@/app/api/brands/route";
import { POST as fetchFeed } from "@/app/api/brands/[id]/fetch-feed/route";
import { getStore } from "@/lib/db";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const bctx = (id: string) => ({ params: Promise.resolve({ id }) });

const PROFILE_OK = {
  data: {
    user: {
      edge_followed_by: { count: 10 },
      edge_owner_to_timeline_media: {
        count: 3,
        edges: [{ node: { thumbnail_src: "https://cdn/a.jpg" } }, { node: { thumbnail_src: "https://cdn/b.jpg" } }],
      },
    },
  },
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes("i.instagram.com")) return { ok: true, json: async () => PROFILE_OK } as unknown as Response;
      return {
        ok: true,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      } as unknown as Response;
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const firstBrandId = async () => (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;

describe("fetch-feed", () => {
  it("stores re-hosted thumbs and then honours the 12h cache", async () => {
    const id = await firstBrandId();
    const res = await fetchFeed(j(`/api/brands/${id}/fetch-feed`, "POST"), bctx(id));
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.thumbs).toHaveLength(2);
    expect(data.thumbs[0]).toMatch(/^https:\/\/stored\//);

    const brand = await getStore().getBrand(id);
    expect(brand!.feedThumbs).toHaveLength(2);
    expect(brand!.feedFetchedAt).toBeTruthy();

    const again = await fetchFeed(j(`/api/brands/${id}/fetch-feed`, "POST"), bctx(id));
    expect((await again.json())).toMatchObject({ ok: false, reason: "cache" });
  });

  it("returns ok:false and leaves the brand alone on an IG block, saying which wall it hit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({ message: "useragent mismatch" }) }) as unknown as Response),
    );
    const id = (await (await listBrands(j("/api/brands", "GET"))).json())[1].id;
    const res = await fetchFeed(j(`/api/brands/${id}/fetch-feed`, "POST"), bctx(id));
    expect(await res.json()).toMatchObject({ ok: false, reason: "blocked" });
    const brand = await getStore().getBrand(id);
    expect(brand!.feedThumbs).toBeNull();
  });

  it("rejects a non-editor", async () => {
    const id = await firstBrandId();
    const res = await fetchFeed(
      new Request(`http://t/api/brands/${id}/fetch-feed`, { method: "POST" }),
      bctx(id),
    );
    expect(res.status).toBe(403);
  });
});
