import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BlobStore } from "./blob-store";
import type { DbShape } from "./store";

/** Local-dev store: the whole DB blob in a JSON file, read-modify-write per op. */
export class JsonStore extends BlobStore {
  constructor(private path: string) {
    super();
    if (!existsSync(path)) this.saveBlob(BlobStore.normalize(null));
  }

  protected async fetchBlob(): Promise<DbShape> {
    if (!existsSync(this.path)) {
      const seeded = BlobStore.normalize(null);
      await this.saveBlob(seeded);
      return seeded;
    }
    return BlobStore.normalize(JSON.parse(readFileSync(this.path, "utf8")));
  }

  protected async saveBlob(db: DbShape): Promise<void> {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(db, null, 2));
  }
}
