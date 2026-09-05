import { getStore } from "@/lib/db";
import { hasDeveloper, json } from "@/lib/api/session";
import { drivePreviewUrl } from "@/lib/sources/drive-folder";
import type { Media } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Broken shape: alt=media fetched from the browser with only an API key — Google
 *  frequently refuses this for a merely "anyone with the link" file, which is why
 *  this got reverted. Matches whether or not the key query param survived intact. */
const BROKEN_DOWNLOAD = /googleapis\.com\/drive\/v3\/files\/([a-zA-Z0-9_-]+)/;

/**
 * One-time fix for plans whose reel videos ended up on the short-lived
 * driveDownloadUrl shape — either from a fresh import while that code was live,
 * or from this same route's previous (now-reversed) direction. Puts them back
 * on Drive's own /preview iframe, which actually plays for anyone with the
 * link. Idempotent: a second run finds nothing left to fix.
 */
export async function POST(req: Request) {
  if (!hasDeveloper(req)) return json({ error: "developer only" }, 403);

  const store = getStore();
  const plans = await store.listPlans();

  let assetsFixed = 0;
  let itemsFixed = 0;
  const touchedPlans: string[] = [];

  const rewrite = (url: string): string | null => {
    const m = BROKEN_DOWNLOAD.exec(url);
    return m ? drivePreviewUrl(m[1]) : null;
  };

  for (const plan of plans) {
    let touched = false;

    const assets = await store.listAssets(plan.id);
    for (const asset of assets) {
      if (asset.kind !== "video") continue;
      const newUrl = rewrite(asset.url);
      if (!newUrl) continue;
      await store.updateAssets([asset.id], { url: newUrl, driveEmbed: true });
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
        return { ...m, url: newUrl, driveEmbed: true };
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
