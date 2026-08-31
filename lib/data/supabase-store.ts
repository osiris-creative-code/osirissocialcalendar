import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BlobStore } from "./blob-store";
import type { DbShape } from "./store";

const ROW_ID = "main";
const TABLE = "app_state";

/**
 * Production store: the whole DB blob lives in one `app_state` row (jsonb),
 * read-modify-write per op — same semantics as JsonStore, backed by Supabase.
 */
export class SupabaseStore extends BlobStore {
  private sb: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    super();
    this.sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  protected async load(): Promise<DbShape> {
    const { data, error } = await this.sb.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle();
    if (error) throw new Error(`supabase load: ${error.message}`);
    if (!data) {
      const seeded = BlobStore.normalize(null);
      await this.persist(seeded);
      return seeded;
    }
    return BlobStore.normalize(data.data as Partial<DbShape>);
  }

  protected async persist(db: DbShape): Promise<void> {
    const { error } = await this.sb.from(TABLE).upsert({ id: ROW_ID, data: db });
    if (error) throw new Error(`supabase persist: ${error.message}`);
  }
}
