import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchImageBytes, fetchImageBytesMany } from "@/lib/ai/fetch-image";

afterEach(() => vi.unstubAllGlobals());

function mockResponse(opts: { ok?: boolean; contentType?: string; bytes?: Uint8Array }) {
  const bytes = opts.bytes ?? new Uint8Array([1, 2, 3]);
  return {
    ok: opts.ok ?? true,
    headers: { get: (k: string) => (k === "content-type" ? opts.contentType ?? "image/jpeg" : null) },
    arrayBuffer: async () => bytes.buffer,
  };
}

describe("fetchImageBytes", () => {
  it("downloads the bytes ourselves instead of handing the model a URL to fetch", async () => {
    const fetchSpy = vi.fn(async () => mockResponse({ contentType: "image/png" }));
    vi.stubGlobal("fetch", fetchSpy);

    const img = await fetchImageBytes("https://cdn.example.com/a.png");

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(img).toEqual({ mediaType: "image/png", base64: Buffer.from([1, 2, 3]).toString("base64") });
  });

  it("returns null instead of throwing when the download fails — never breaks the whole AI call", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ ok: false })));
    expect(await fetchImageBytes("https://cdn.example.com/missing.png")).toBeNull();
  });

  it("returns null instead of throwing when the request errors or times out", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network error");
    }));
    expect(await fetchImageBytes("https://cdn.example.com/a.png")).toBeNull();
  });

  it("rejects a response that isn't actually an image", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ contentType: "text/html" })));
    expect(await fetchImageBytes("https://cdn.example.com/a.html")).toBeNull();
  });

  it("rejects a file over the size guard", async () => {
    const big = new Uint8Array(6 * 1024 * 1024);
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse({ bytes: big })));
    expect(await fetchImageBytes("https://cdn.example.com/big.png")).toBeNull();
  });
});

describe("fetchImageBytesMany", () => {
  it("fetches in parallel and drops the ones that failed, keeping their url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("bad") ? mockResponse({ ok: false }) : mockResponse({}),
      ),
    );
    const out = await fetchImageBytesMany([
      "https://cdn.example.com/good1.jpg",
      "https://cdn.example.com/bad.jpg",
      "https://cdn.example.com/good2.jpg",
    ]);
    expect(out.map((r) => r.url)).toEqual([
      "https://cdn.example.com/good1.jpg",
      "https://cdn.example.com/good2.jpg",
    ]);
  });
});
