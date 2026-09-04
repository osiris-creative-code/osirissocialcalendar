import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { putUpload } from "@/lib/uploads";
import { fetchFeed } from "@/lib/instagram";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
const TWELVE_H = 12 * 60 * 60 * 1000;

/** Best-effort: fill brand.feedThumbs from the public Instagram profile. */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  const force = new URL(req.url).searchParams.get("force") === "1";
  const store = getStore();
  const brand = await store.getBrand(id);
  if (!brand) return json({ error: "brand not found" }, 404);
  if (!brand.instagramHandle) return json({ ok: false, reason: "handle" });

  if (
    !force &&
    brand.feedFetchedAt &&
    Date.now() - new Date(brand.feedFetchedAt).getTime() < TWELVE_H
  ) {
    return json({ ok: false, reason: "cache", thumbs: brand.feedThumbs ?? [] });
  }

  const result = await fetchFeed(brand.instagramHandle);
  if (!result.ok) {
    // Say which wall we hit: on a serverless host Instagram blocks the IP, and
    // the only fix is a provider key or the manual screenshot.
    return json({
      ok: false,
      reason: result.reason,
      hint: process.env.INSTAGRAM_API_URL
        ? "Servis yanıt vermedi — anahtarı ve kotayı kontrol et."
        : "Instagram sunucu IP'lerini engelliyor. Bir servis anahtarı tanımla (INSTAGRAM_API_URL + INSTAGRAM_API_KEY) ya da feed ekran görüntüsünü elle yükle.",
    });
  }
  const profile = result.profile;

  // Re-host — Instagram CDN URLs expire quickly.
  const stored: string[] = [];
  for (const src of profile.thumbs) {
    try {
      const r = await fetch(src);
      if (!r.ok) continue;
      const bytes = Buffer.from(await r.arrayBuffer());
      const { url } = await putUpload({
        name: `feed-${id}-${stored.length}.jpg`,
        contentType: r.headers.get("content-type") || "image/jpeg",
        bytes,
      });
      stored.push(url);
    } catch {
      /* skip this thumb */
    }
  }
  if (stored.length === 0) return json({ ok: false, reason: "rehost" });

  await store.updateBrand(id, {
    feedThumbs: stored,
    feedFetchedAt: new Date().toISOString(),
  });
  return json({ ok: true, thumbs: stored, posts: profile.posts, followers: profile.followers });
}
