import type { ItemType } from "@/lib/types";
import type { Asset, Source } from "./types";

const API = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Pull a Drive folder id out of any of the URL shapes Google hands out (or a bare id). */
export function parseDriveFolderId(url: string): string | null {
  const s = url.trim();
  const folders = /\/folders\/([a-zA-Z0-9_-]+)/.exec(s);
  if (folders) return folders[1];
  const idParam = /[?&]id=([a-zA-Z0-9_-]+)/.exec(s);
  if (idParam) return idParam[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return null;
}

export function driveDownloadUrl(id: string, apiKey: string): string {
  return `${API}/${id}?alt=media&key=${apiKey}`;
}

/** Pull a Drive *file* id out of a share link (…/file/d/<id>/view, ?id=<id>, /uc?id=<id>). */
export function parseDriveFileId(url: string): string | null {
  const s = url.trim();
  const fileD = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(s);
  if (fileD) return fileD[1];
  const idParam = /[?&]id=([a-zA-Z0-9_-]+)/.exec(s);
  if (idParam) return idParam[1];
  const dOnly = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(s);
  if (dOnly) return dOnly[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return null;
}

const norm = (s: string) => s.toLocaleLowerCase("tr").trim();

/** Which slot type a folder name denotes, or null if it isn't a type folder. */
export function folderType(name: string): ItemType | null {
  const n = norm(name);
  if (n === "post" || n.startsWith("post")) return "post";
  if (n === "story" || n.startsWith("story") || n.startsWith("hikaye") || n.startsWith("hikâye"))
    return "story";
  if (n === "reel" || n === "reels" || n.startsWith("reel")) return "reel";
  return null;
}
const isCrop = (name: string) => norm(name).includes("crop");
const isCarousel = (name: string) => /kayd[ıi]rmal[ıi]/.test(norm(name));

type DriveEntry = { id: string; name: string; mimeType: string };

/**
 * Lists a *public* ("anyone with the link") shoot folder using only an API key.
 *
 * The shoot folder is walked recursively:
 *  - a `POST` / `STORY` / `REELS` subfolder → its media get that type;
 *  - a `KAYDIRMALI N` subfolder inside POST → one carousel (slides ordered by name);
 *  - a folder whose name contains `CROP` → skipped entirely (cut-outs for other platforms);
 *  - any other wrapper folder (e.g. `… EK`) → descended into, looking for POST/STORY/REELS;
 *  - loose files with no type folder above them → ignored.
 */
export class DriveFolderSource implements Source {
  private calls = 0;

  constructor(
    private folderId: string,
    private apiKey: string,
  ) {}

  private async children(folderId: string): Promise<DriveEntry[]> {
    if (this.calls >= 80) return [];
    this.calls++;
    const out: DriveEntry[] = [];
    let pageToken: string | undefined;
    do {
      const u = new URL(API);
      u.searchParams.set("q", `'${folderId}' in parents and trashed = false`);
      u.searchParams.set("key", this.apiKey);
      u.searchParams.set("fields", "nextPageToken, files(id, name, mimeType)");
      u.searchParams.set("pageSize", "1000");
      u.searchParams.set("supportsAllDrives", "true");
      u.searchParams.set("includeItemsFromAllDrives", "true");
      if (pageToken) u.searchParams.set("pageToken", pageToken);
      const res = await fetch(u, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`drive list ${res.status}: ${await res.text().catch(() => "")}`);
      const body = (await res.json()) as { files?: DriveEntry[]; nextPageToken?: string };
      out.push(...(body.files ?? []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return out;
  }

  async list(): Promise<Asset[]> {
    const assets: Asset[] = [];
    let carouselSeq = 0;

    const walk = async (
      id: string,
      type: ItemType | null,
      carouselGroup: string | null,
      depth: number,
    ): Promise<void> => {
      if (depth > 5) return;
      const entries = await this.children(id);
      const folders = entries.filter((e) => e.mimeType === FOLDER_MIME);
      const media = entries
        .filter((e) => e.mimeType.startsWith("image/") || e.mimeType.startsWith("video/"))
        .sort((a, b) => a.name.localeCompare(b.name, "tr", { numeric: true }));

      if (type) {
        media.forEach((f, i) => {
          assets.push({
            id: f.id,
            name: f.name,
            type,
            kind: f.mimeType.startsWith("video/") ? "video" : "image",
            url: driveDownloadUrl(f.id, this.apiKey),
            slideGroup: carouselGroup ?? undefined,
            slideOrder: carouselGroup ? i + 1 : 1,
          });
        });
      }

      for (const folder of folders) {
        if (isCrop(folder.name)) continue;
        const ft = folderType(folder.name);
        if (ft) {
          await walk(folder.id, ft, null, depth + 1);
        } else if (type && isCarousel(folder.name)) {
          carouselSeq += 1;
          await walk(folder.id, type, `drive-carousel-${carouselSeq}`, depth + 1);
        } else {
          await walk(folder.id, null, null, depth + 1);
        }
      }
    };

    await walk(this.folderId, null, null, 0);
    return assets;
  }
}
