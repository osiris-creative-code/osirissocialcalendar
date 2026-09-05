export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ fileId: string }> };

const PASSTHROUGH_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"];

/**
 * Streams a Drive-hosted reel's bytes through our own server instead of either
 * of the two things that didn't work: Drive's own /preview iframe (its own
 * uncontrollable player UI) or handing the browser a googleapis.com url with
 * the API key baked in (Google refuses alt=media from an unauthenticated
 * browser context for most "anyone with the link" files).
 *
 * This route is public on purpose — the brand's page needs it and has no team
 * cookie. The Google API key never leaves the server: the authenticated call
 * happens here, in the same request context that already works reliably for
 * re-hosting images, and only the resulting bytes go to the client.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { fileId } = await ctx.params;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return new Response("Drive video kaynağı yapılandırılmamış", { status: 500 });

  const range = req.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`,
      { headers: range ? { range } : undefined },
    );
  } catch (e) {
    return new Response(`Video alınamadı: ${(e as Error).message}`, { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("Video alınamadı", { status: upstream.status });
  }

  const headers = new Headers();
  for (const h of PASSTHROUGH_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  if (!headers.has("cache-control")) headers.set("cache-control", "public, max-age=3600");

  return new Response(upstream.body, { status: upstream.status, headers });
}
