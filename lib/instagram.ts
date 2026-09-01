const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
const IG_APP_ID = "936619743392459";

export type WebProfile = { thumbs: string[]; posts: number; followers: number };

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
