import { join } from "node:path";
import { JsonStore } from "./data/json-store";
import type { DataStore } from "./data/store";

let instance: DataStore | null = null;

export function getStore(): DataStore {
  if (!instance) {
    const path = process.env.RITIM_DB_PATH ?? join(process.cwd(), ".data", "db.json");
    instance = new JsonStore(path);
  }
  return instance;
}
