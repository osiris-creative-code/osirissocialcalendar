import { getStore } from "@/lib/db";
import { json, requireEditor } from "@/lib/api/session";
import { putUpload } from "@/lib/uploads";
import { processInChunks } from "@/lib/concurrency";
import {
  DriveFolderSource,
  parseDriveFolderId,
  parseDriveFileId,
  driveDownloadUrl,
  drivePreviewUrl,
  driveResizedImageUrl,
  driveThumbnailUrl,
} from "@/lib/sources/drive-folder";
import type { Asset } from "@/lib/sources/types";
import type { NewAsset } from "@/lib/data/store";

export const maxDuration = 60;

const MAX_REHOST_BYTES = 40 * 1024 * 1024; // stay well under Supabase's 50 MB cap
const CONCURRENCY = 5; // files downloaded+uploaded in parallel per chunk
const MAX_PER_RUN = 60; // cap so one click stays well inside the 60s function limit

type Ctx = { params: Promise<{ id: string }> };

/** Pull media from this plan's shoot Drive folder + separate reels links into the plan's assets. */
export async function POST(req: Request, ctx: Ctx) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return json({ error: "GOOGLE_API_KEY tanımlı değil (Vercel ortam değişkeni)" }, 400);

    const { id } = await ctx.params;
    const store = getStore();
    const plan = await store.getPlan(id);
    if (!plan) return json({ error: "plan not found" }, 404);

    const folderId = plan.driveFolderUrl ? parseDriveFolderId(plan.driveFolderUrl) : null;
    const reelLinks = (plan.reelLinks ?? []).map((s) => s.trim()).filter(Boolean);
    if (!folderId && reelLinks.length === 0) {
      return json({ error: "planda Drive klasör linki ya da reels linki yok" }, 400);
    }

    // 1) walk the shoot folder
    let listed: Asset[] = [];
    if (folderId) {
      try {
        listed = await new DriveFolderSource(folderId, apiKey).list();
      } catch (e) {
        return json(
          {
            error:
              `Drive klasörü okunamadı: ${(e as Error).message}. ` +
              `Klasör "bağlantısı olan herkes"e açık mı, link doğru mu?`,
          },
          502,
        );
      }
      if (listed.length === 0) {
        return json({
          imported: 0,
          skipped: 0,
          failed: [],
          note: "Klasörde POST / STORY / REELS alt klasörü ya da görsel bulunamadı.",
        });
      }
    }

    // 2) reels delivered separately — a Drive folder link (a bag of videos) or single file links
    const reelAssets: Asset[] = [];
    const linkFailed: { name: string; reason: string }[] = [];
    let reelIdx = 0;
    for (const link of reelLinks) {
      const asFolder = /\/folders\//.test(link) ? parseDriveFolderId(link) : null;
      if (asFolder) {
        try {
          const found = await new DriveFolderSource(asFolder, apiKey).list("reel");
          if (found.length === 0) {
            linkFailed.push({ name: link.slice(0, 60), reason: "reels klasöründe video bulunamadı" });
          }
          reelAssets.push(...found);
        } catch (e) {
          linkFailed.push({ name: link.slice(0, 60), reason: `reels klasörü okunamadı: ${(e as Error).message}` });
        }
        continue;
      }
      const fileId = parseDriveFileId(link);
      if (!fileId) {
        linkFailed.push({ name: link.slice(0, 60), reason: "Google Drive klasör/dosya linki değil" });
        continue;
      }
      reelIdx += 1;
      reelAssets.push({
        id: fileId,
        name: `reels-link-${reelIdx}.mp4`,
        type: "reel",
        kind: "video",
        url: driveDownloadUrl(fileId, apiKey),
        slideOrder: 1,
      });
    }

    const all = [...listed, ...reelAssets];
    const key = (a: { name: string; slideGroup?: string | null }) => `${a.slideGroup ?? ""}::${a.name}`;
    const have = new Set((await store.listAssets(id)).map(key));
    const allFresh = all.filter((a) => !have.has(key(a)));
    const fresh = allFresh.slice(0, MAX_PER_RUN);
    const remaining = allFresh.length - fresh.length;

    const failed = [...linkFailed];
    let imported = 0;

    // One file: download (unless it's a video or an oversized image — those play/link
    // straight from Drive) and re-host to Storage. Never throws — failures are reported.
    const processOne = async (a: Asset): Promise<NewAsset | null> => {
      if (a.kind === "video") {
        // Tried streaming the raw bytes straight from Drive's API (driveDownloadUrl)
        // to get away from Drive's own /preview iframe player and its toolbar. That
        // broke playback outright: alt=media with only an API key (no OAuth) is
        // fetched here from the *browser*, and Google frequently refuses that for a
        // merely "anyone with the link" file — unlike the identical-looking call this
        // route already makes for images, which runs server-side and works fine.
        // Back to the iframe: worse UI, but it actually plays for everyone with the
        // link, which the download URL turned out not to reliably do.
        return {
          type: a.type,
          kind: "video",
          url: drivePreviewUrl(a.id),
          posterUrl: driveThumbnailUrl(a.id),
          name: a.name,
          slideGroup: a.slideGroup ?? null,
          slideOrder: a.slideOrder,
          webPlayable: true,
          driveEmbed: true,
        };
      }

      const driveImage = (url: string) => ({
        type: a.type,
        kind: "image" as const,
        url,
        name: a.name,
        slideGroup: a.slideGroup ?? null,
        slideOrder: a.slideOrder,
      });

      // Oversized image → skip re-hosting, use a Google-resized copy from Drive.
      if (a.sizeBytes && a.sizeBytes > MAX_REHOST_BYTES) {
        return driveImage(driveResizedImageUrl(a.id));
      }

      try {
        const res = await fetch(a.url);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`indirilemedi ${res.status} ${body.slice(0, 120)}`);
        }
        const bytes = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "application/octet-stream";
        const { url } = await putUpload({ name: a.name, contentType, bytes });
        return { ...driveImage(url), kind: a.kind };
      } catch (e) {
        // Storage rejected it (size) or download failed → fall back to the Drive copy.
        if (/size|exceed|too large|413/i.test((e as Error).message)) {
          return driveImage(driveResizedImageUrl(a.id));
        }
        throw e;
      }
    };

    // Chunks of CONCURRENCY, saved to the store as each chunk finishes — a timeout mid-run
    // only loses the chunk in flight, not everything already processed.
    await processInChunks(fresh, CONCURRENCY, processOne, async (results, chunk) => {
      const chunkStaged: NewAsset[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) chunkStaged.push(r.value);
        else if (r.status === "rejected") {
          failed.push({ name: chunk[i].name, reason: (r.reason as Error).message });
        }
      });
      if (chunkStaged.length) {
        await store.addAssets(id, chunkStaged);
        imported += chunkStaged.length;
      }
    });

    await store.logActivity({
      planId: id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "drive_iceri_aktarildi",
      meta: { imported, skipped: all.length - allFresh.length, failed: failed.length, remaining },
    });

    return json({
      imported,
      skipped: all.length - allFresh.length,
      failed,
      ...(remaining > 0
        ? { note: `${remaining} dosya daha var — devam etmek için "Drive'dan çek"e tekrar bas.` }
        : {}),
    });
  } catch (e) {
    return json({ error: `beklenmeyen hata: ${(e as Error).message}` }, 500);
  }
}
