import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as proxyVideo } from "@/app/api/drive-video/[fileId]/route";

const ctx = (fileId: string) => ({ params: Promise.resolve({ fileId }) });

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_API_KEY;
});

describe("GET /api/drive-video/[fileId]", () => {
  it("500s when GOOGLE_API_KEY is missing, without ever calling out", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await proxyVideo(new Request("http://t/api/drive-video/abc"), ctx("abc"));
    expect(res.status).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("streams the upstream body straight through with a full request", async () => {
    process.env.GOOGLE_API_KEY = "KEY";
    const body = new Uint8Array([1, 2, 3]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        expect(url).toBe("https://www.googleapis.com/drive/v3/files/abc?alt=media&key=KEY");
        expect((init?.headers as Record<string, string> | undefined)?.range).toBeUndefined();
        return new Response(body, {
          status: 200,
          headers: { "content-type": "video/mp4", "content-length": "3" },
        });
      }),
    );

    const res = await proxyVideo(new Request("http://t/api/drive-video/abc"), ctx("abc"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("video/mp4");
    expect(res.headers.get("accept-ranges")).toBe("bytes"); // added when upstream doesn't set it
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(body);
  });

  it("forwards a Range header and passes through a 206 partial response", async () => {
    process.env.GOOGLE_API_KEY = "KEY";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        expect((init?.headers as Record<string, string>).range).toBe("bytes=100-199");
        return new Response(new Uint8Array(100), {
          status: 206,
          headers: {
            "content-type": "video/mp4",
            "content-range": "bytes 100-199/1000",
            "accept-ranges": "bytes",
          },
        });
      }),
    );

    const res = await proxyVideo(
      new Request("http://t/api/drive-video/abc", { headers: { range: "bytes=100-199" } }),
      ctx("abc"),
    );
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 100-199/1000");
  });

  it("passes through an upstream error status instead of pretending it worked", async () => {
    process.env.GOOGLE_API_KEY = "KEY";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 403 })));
    const res = await proxyVideo(new Request("http://t/api/drive-video/abc"), ctx("abc"));
    expect(res.status).toBe(403);
  });
});
