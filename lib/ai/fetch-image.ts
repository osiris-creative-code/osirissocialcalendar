/**
 * Fetch an image ourselves and hand the model raw bytes instead of a URL.
 *
 * Both providers support "give me a URL, I'll fetch it" — but their fetcher
 * runs on a tight timeout and has repeatedly failed against Supabase Storage
 * in production ("400 Unable to download content … before the timeout"),
 * which silently drops every vision feature to its text-only fallback. Our
 * own server fetching the file — same infra the upload just went to — is far
 * more reliable, and downloading once here is cheaper than the model retrying.
 */
export type ImageBytes = { mediaType: string; base64: string };

const MAX_BYTES = 5 * 1024 * 1024; // stay well under both providers' per-image limits
const TIMEOUT_MS = 12_000;

/**
 * Both providers only accept an exact media_type from a short fixed list
 * (image/jpeg, image/png, image/webp, image/gif). A server or an older browser
 * can send the non-standard "image/jpg" — normalize it here, once, so neither
 * adapter has to and a stray header never turns into a hard API rejection.
 */
function normalizeMediaType(contentType: string): string | null {
  const base = contentType.split(";")[0].trim().toLowerCase();
  if (base === "image/jpg") return "image/jpeg";
  if (/^image\/(jpeg|png|webp|gif)$/.test(base)) return base;
  return null;
}

export async function fetchImageBytes(url: string): Promise<ImageBytes | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const mediaType = normalizeMediaType(res.headers.get("content-type") || "");
    if (!mediaType) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;

    return { mediaType, base64: buf.toString("base64") };
  } catch {
    return null; // caller treats this exactly like "no image" — never breaks the whole call
  }
}

/** Fetch several URLs in parallel and drop the ones that didn't come back. */
export async function fetchImageBytesMany(
  urls: string[],
): Promise<{ url: string; image: ImageBytes }[]> {
  const results = await Promise.all(urls.map(async (url) => ({ url, image: await fetchImageBytes(url) })));
  return results.filter((r): r is { url: string; image: ImageBytes } => !!r.image);
}
