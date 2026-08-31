import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BlobStore } from "./blob-store";
import type { DbShape } from "./store";

const ROW_ID = "main";
const TABLE = "app_state";

/**
 * Production store: the whole DB blob in one `app_state` row (jsonb) with an
 * integer `version` for optimistic locking — concurrent writes serialize via
 * retry instead of clobbering each other.
 */
export class SupabaseStore extends BlobStore {
  private sb: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    super();
    this.sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  protected async fetchBlob(): Promise<{ db: DbShape; version: number }> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select("data, version")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (error) throw new Error(`supabase load: ${error.message}`);

    if (!data) {
      const seeded = BlobStore.normalize(null);
      // Ignore a duplicate-key error from a concurrent first write.
      await this.sb.from(TABLE).insert({ id: ROW_ID, data: seeded, version: 1 });
      const again = await this.sb
        .from(TABLE)
        .select("data, version")
        .eq("id", ROW_ID)
        .maybeSingle();
      if (again.data) {
        return {
          db: BlobStore.normalize(again.data.data as Partial<DbShape>),
          version: (again.data.version as number) ?? 1,
        };
      }
      return { db: seeded, version: 1 };
    }

    return {
      db: BlobStore.normalize(data.data as Partial<DbShape>),
      version: (data.version as number) ?? 0,
    };
  }

  protected async saveBlob(
    db: DbShape,
    version: number,
  ): Promise<{ ok: boolean; version: number }> {
    const next = version + 1;
    const { data, error } = await this.sb
      .from(TABLE)
      .update({ data: db, version: next })
      .eq("id", ROW_ID)
      .eq("version", version)
      .select("version");
    if (error) throw new Error(`supabase persist: ${error.message}`);
    if (!data || data.length === 0) return { ok: false, version: -1 };
    return { ok: true, version: next };
  }
}
