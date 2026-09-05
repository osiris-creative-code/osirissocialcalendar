import { getStore } from "@/lib/db";
import { hasDeveloper, json } from "@/lib/api/session";
import { driveProxyUrl } from "@/lib/sources/drive-folder";
import type { Media } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Both prior shapes this route has produced or found in the wild:
 *  Drive's own /preview iframe, and the short-lived (and broken) direct
 *  googleapis.com download url. Either one gets converged onto the proxy. */
const OLD_SHAPES = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/preview/,
  /googleapis\.com\/drive\/v3\/files\/([a-zA-Z0-9_-]+)/,
];

/**
 * Puts every reel video on /api/drive-video/[fileId] — our own server proxying
 * Drive's bytes through, no Drive UI and no API key ever reaching the browser.
 * Fixes whichever of the two prior shapes a plan happens to be on: Drive's own
 * /preview iframe (its own uncontrollable player), or the direct-download url
 * that turned out to get refused by Google outside an authenticated context.
 * Idempotent: a second run finds nothing left to fix.
 */
export async function POST(req: Request) {
  if (!hasDeveloper(req)) return json({ error: "developer only" }, 403);

  const store = getStore();
  const plans = await store.listPlans();

  let assetsFixed = 0;
  let itemsFixed = 0;
  const touchedPlans: string[] = [];

  const rewrite = (url: string): string | null => {
    if (url.startsWith("/api/drive-video/")) return null; // already on the proxy
    for (const shape of OLD_SHAPES) {
      const m = shape.exec(url);
      if (m) return driveProxyUrl(m[1]);
    }
    return null;
  };

  for (const plan of plans) {
    let touched = false;

    const assets = await store.listAssets(plan.id);
    for (const asset of assets) {
      if (asset.kind !== "video") continue;
      const newUrl = rewrite(asset.url);
      if (!newUrl) continue;
      await store.updateAssets([asset.id], { url: newUrl, driveEmbed: undefined });
      assetsFixed += 1;
      touched = true;
    }

    const items = await store.listItems(plan.id);
    for (const item of items) {
      let itemTouched = false;
      const media: Media[] = item.media.map((m) => {
        if (m.kind !== "video") return m;
        const newUrl = rewrite(m.url);
        if (!newUrl) return m;
        itemTouched = true;
        return { ...m, url: newUrl, driveEmbed: undefined };
      });
      if (!itemTouched) continue;
      await store.updateItem(item.id, { media });
      itemsFixed += 1;
      touched = true;
    }

    if (touched) touchedPlans.push(plan.id);
  }

  return json({ plansScanned: plans.length, plansFixed: touchedPlans.length, assetsFixed, itemsFixed });
}
