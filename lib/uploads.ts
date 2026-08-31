import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { newId } from "@/lib/ids";

const BUCKET = process.env.SUPABASE_BUCKET ?? "ritim";

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function safeKey(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file";
  return `${newId()}-${clean}`;
}

export type UploadTarget =
  | { mode: "supabase"; key: string; signedUrl: string; publicUrl: string }
  | { mode: "local"; key: string; uploadPath: string; publicUrl: string };

/** Create a one-shot upload target the browser PUTs the file straight to. */
export async function createUploadTarget(name: string): Promise<UploadTarget> {
  const key = safeKey(name);
  const sb = supabase();

  if (sb) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(key);
    if (error) throw new Error(`sign upload: ${error.message}`);
    return {
      mode: "supabase",
      key,
      signedUrl: data.signedUrl,
      publicUrl: sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl,
    };
  }

  return { mode: "local", key, uploadPath: `/api/uploads/${encodeURIComponent(key)}`, publicUrl: `/uploads/${key}` };
}

/** Local dev only: write raw bytes to public/uploads. */
export async function writeLocalUpload(key: string, bytes: Buffer): Promise<void> {
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, key.replace(/[^a-zA-Z0-9._-]/g, "_")), bytes);
}
