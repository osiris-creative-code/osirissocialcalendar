import { join } from "node:path";
import { JsonStore } from "./data/json-store";
import { SupabaseStore } from "./data/supabase-store";
import type { DataStore } from "./data/store";

let instance: DataStore | null = null;

export function getStore(): DataStore {
  if (!instance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      instance = new SupabaseStore(url, key);
    } else {
      const path = process.env.OSIRIS_DB_PATH ?? join(process.cwd(), ".data", "db.json");
      instance = new JsonStore(path);
    }
  }
  return instance;
}

export function storeIsPersistent(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
