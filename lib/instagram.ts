const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
const IG_APP_ID = "936619743392459";

export type WebProfile = { thumbs: string[]; posts: number; followers: number };

/** Why a fetch came back empty — the UI says something useful instead of "olmadı". */
export type FetchFailure = "no-handle" | "blocked" | "not-found" | "no-media";
export type FetchResult =
  | { ok: true; profile: WebProfile; via: "provider" | "direct" }
  | { ok: false; reason: FetchFailure };

/**
 * Optional paid provider, configured with env vars rather than baked in.
 *
 * Instagram blocks datacenter IPs on the first request, so the direct call
 * below essentially never succeeds from a serverless host — a provider with
 * residential proxies is the only thing that works there. Set
 * INSTAGRAM_API_URL (with {handle} in it) and INSTAGRAM_API_KEY to use one;
 * without them the app falls back to the manual screenshot upload.
 */
async function fetchViaProvider(handle: string): Promise<WebProfile | null> {
  const template = process.env.INSTAGRAM_API_URL;
  const key = process.env.INSTAGRAM_API_KEY;
  if (!template || !key) return null;
  try {
    const res = await fetch(template.replace("{handle}", encodeURIComponent(handle)), {
      headers: { "x-access-key": key, authorization: `Bearer ${key}`, accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    const thumbs = collectThumbs(body).slice(0, 12);
    if (thumbs.length === 0) return null;
    return { thumbs, posts: thumbs.length, followers: 0 };
  } catch {
    return null;
  }
}

/** Providers disagree on shape; pull anything that looks like an image URL. */
function collectThumbs(value: unknown, depth = 0): string[] {
  if (depth > 6 || value == null) return [];
  if (typeof value === "string") {
    return /^https?:\/\/\S+\.(jpe?g|png|webp)/i.test(value) ? [value] : [];
  }
  if (Array.isArray(value)) return value.flatMap((v) => collectThumbs(v, depth + 1));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((v) =>
      collectThumbs(v, depth + 1),
    );
  }
  return [];
}

/** Provider first when configured, then the direct read. */
export async function fetchFeed(handle: string): Promise<FetchResult> {
  const clean = handle.trim().replace(/^@/, "");
  if (!clean) return { ok: false, reason: "no-handle" };

  const viaProvider = await fetchViaProvider(clean);
  if (viaProvider) return { ok: true, profile: viaProvider, via: "provider" };

  const direct = await fetchWebProfile(clean);
  if (direct) return { ok: true, profile: direct, via: "direct" };

  return { ok: false, reason: "blocked" };
}

/**
 * Best-effort read of a public profile via Instagram's own web endpoint.
 * No official app, no token. Instagram rate-limits datacenter IPs hard, so this
 * fails often — callers must treat `null` as "couldn't get it" and fall back.
 */
export async function fetchWebProfile(handle: string): Promise<WebProfile | null> {
  const clean = handle.trim().replace(/^@/, "");
  if (!clean) return null;
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`,
      {
        headers: { "x-ig-app-id": IG_APP_ID, "user-agent": UA, accept: "*/*" },
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: {
        user?: {
          edge_owner_to_timeline_media?: {
            count?: number;
            edges?: { node?: { thumbnail_src?: string; display_url?: string } }[];
          };
          edge_followed_by?: { count?: number };
        };
      };
    };
    const user = body?.data?.user;
    if (!user) return null;
    const media = user.edge_owner_to_timeline_media;
    const thumbs = (media?.edges ?? [])
      .map((e) => e.node?.thumbnail_src || e.node?.display_url)
      .filter((u): u is string => !!u)
      .slice(0, 12);
    if (thumbs.length === 0) return null;
    return {
      thumbs,
      posts: media?.count ?? thumbs.length,
      followers: user.edge_followed_by?.count ?? 0,
    };
  } catch {
    return null;
  }
}
