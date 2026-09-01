import type { Asset, Source } from "./types";
import { slideOrderFromName } from "./slide-order";
import { typeFromName, kindFromMime } from "./classify";

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
  return `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${apiKey}`;
}

type DriveFile = { id: string; name: string; mimeType: string };

/**
 * Lists a *public* ("anyone with the link") Drive folder using only an API key —
 * no OAuth, no consent screen, no Google verification.
 */
export class DriveFolderSource implements Source {
  constructor(
    private folderId: string,
    private apiKey: string,
  ) {}

  private async listFiles(): Promise<DriveFile[]> {
    const out: DriveFile[] = [];
    let pageToken: string | undefined;
    do {
      const u = new URL("https://www.googleapis.com/drive/v3/files");
      u.searchParams.set("q", `'${this.folderId}' in parents and trashed = false`);
      u.searchParams.set("key", this.apiKey);
      u.searchParams.set("fields", "nextPageToken, files(id, name, mimeType)");
      u.searchParams.set("pageSize", "1000");
      u.searchParams.set("supportsAllDrives", "true");
      u.searchParams.set("includeItemsFromAllDrives", "true");
      if (pageToken) u.searchParams.set("pageToken", pageToken);

      const res = await fetch(u, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`drive list ${res.status}: ${await res.text().catch(() => "")}`);
      const body = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string };
      out.push(...(body.files ?? []));
      pageToken = body.nextPageToken;
    } while (pageToken);
    return out;
  }

  async list(): Promise<Asset[]> {
    const files = (await this.listFiles()).filter(
      (f) => f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/"),
    );
    return files.map((f) => {
      const type = typeFromName(f.name);
      const order = slideOrderFromName(f.name);
      const carousel = order != null && type !== "story" && type !== "reel";
      return {
        id: f.id,
        name: f.name,
        type,
        kind: kindFromMime(f.mimeType),
        url: driveDownloadUrl(f.id, this.apiKey),
        slideGroup: carousel
          ? f.name.replace(/[_\s-]?\d+\s*\.[a-z0-9]+$/i, "").trim() || "grup"
          : undefined,
        slideOrder: order ?? 1,
      };
    });
  }
}
