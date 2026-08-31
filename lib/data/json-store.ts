import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BlobStore } from "./blob-store";
import type { DbShape } from "./store";

type FileShape = { version: number; data: DbShape };

/** Local-dev store: the whole DB blob in a JSON file. */
export class JsonStore extends BlobStore {
  constructor(private path: string) {
    super();
    if (!existsSync(path)) this.saveBlob(BlobStore.normalize(null), 0);
  }

  protected async fetchBlob(): Promise<{ db: DbShape; version: number }> {
    if (!existsSync(this.path)) {
      const db = BlobStore.normalize(null);
      await this.saveBlob(db, 0);
      return { db, version: 1 };
    }
    const raw = JSON.parse(readFileSync(this.path, "utf8")) as FileShape | DbShape;
    if (raw && typeof raw === "object" && "version" in raw && "data" in raw) {
      return { db: BlobStore.normalize((raw as FileShape).data), version: (raw as FileShape).version };
    }
    return { db: BlobStore.normalize(raw as DbShape), version: 0 };
  }

  protected async saveBlob(db: DbShape, version: number): Promise<{ ok: boolean; version: number }> {
    mkdirSync(dirname(this.path), { recursive: true });
    const next = version + 1;
    writeFileSync(this.path, JSON.stringify({ version: next, data: db } satisfies FileShape, null, 2));
    return { ok: true, version: next };
  }
}
