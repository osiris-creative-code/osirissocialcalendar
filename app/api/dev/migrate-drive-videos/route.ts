import { getStore } from "@/lib/db";
import { hasDeveloper, json } from "@/lib/api/session";
import { driveDownloadUrl, parseDriveFileId } from "@/lib/sources/drive-folder";
import type { Media } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Old-shape url: Drive's own /preview iframe page, not a byte stream. */
const OLD_PREVIEW = /drive\.google\.com\/file\/d\//;

/**
 * One-time fix for plans imported before reel videos moved off Drive's own
 * /preview iframe (Google's uncontrollable player toolbar + letterboxing) and
 * onto driveDownloadUrl (raw bytes into our own <video>). New imports already
 * get the right shape — this rewrites whatever's still sitting on the old one,
 * for both the asset pool and any plan item that already points at it.
 * Idempotent: a second run finds nothing left to fix.
 */
export async function POST(req: Request) {
  if (!hasDeveloper(req)) return json({ error: "developer only" }, 403);

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return json({ error: "GOOGLE_API_KEY tanımlı değil (Vercel ortam değişkeni)" }, 400);

  const store = getStore();
  const plans = await store.listPlans();

  let assetsFixed = 0;
  let itemsFixed = 0;
  const touchedPlans: string[] = [];

  const rewrite = (url: string): string | null => {
    if (!OLD_PREVIEW.test(url)) return null;
    const fileId = parseDriveFileId(url);
    return fileId ? driveDownloadUrl(fileId, apiKey) : null;
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
