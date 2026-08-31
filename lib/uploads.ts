import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { newId } from "@/lib/ids";

const BUCKET = process.env.SUPABASE_BUCKET ?? "osiris";

function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function safeKey(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file";
  return `${newId()}-${clean}`;
}

/** Create the public bucket if it isn't there yet (so setup can't be forgotten). */
async function ensureBucket(sb: SupabaseClient): Promise<void> {
  const { data } = await sb.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await sb.storage.createBucket(BUCKET, { public: true });
  // Ignore "already exists" races.
  if (error && !/exist/i.test(error.message)) throw new Error(`bucket: ${error.message}`);
}

export type UploadTarget =
  | { mode: "supabase"; key: string; signedUrl: string; publicUrl: string }
  | { mode: "local"; key: string; uploadPath: string; publicUrl: string };

/** Signed target the browser PUTs a (possibly large) file straight to. */
export async function createUploadTarget(name: string): Promise<UploadTarget> {
  const key = safeKey(name);
  const sb = supabase();

  if (sb) {
    await ensureBucket(sb);
    const { data, error } = await sb.storage
      .from(BUCKET)
      .createSignedUploadUrl(key, { upsert: true });
    if (error) throw new Error(`sign upload: ${error.message}`);
    return {
      mode: "supabase",
      key,
      signedUrl: data.signedUrl,
      publicUrl: sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl,
    };
  }

  return {
    mode: "local",
    key,
    uploadPath: `/api/uploads/${encodeURIComponent(key)}`,
    publicUrl: `/uploads/${key}`,
  };
}

/** Server-side upload for small files (logos). Returns a browser-usable URL. */
export async function putUpload(input: {
  name: string;
  contentType: string;
  bytes: Buffer;
}): Promise<{ url: string }> {
  const key = safeKey(input.name);
  const sb = supabase();

  if (sb) {
    await ensureBucket(sb);
    const { error } = await sb.storage.from(BUCKET).upload(key, input.bytes, {
      contentType: input.contentType || "application/octet-stream",
      upsert: true,
    });
    if (error) throw new Error(`upload: ${error.message}`);
    return { url: sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl };
  }

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, key), input.bytes);
  return { url: `/uploads/${key}` };
}

/** Local dev only: write raw bytes to public/uploads. */
export async function writeLocalUpload(key: string, bytes: Buffer): Promise<void> {
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, key.replace(/[^a-zA-Z0-9._-]/g, "_")), bytes);
}

/** Best-effort removal of uploaded files by their public URL. Never throws. */
export async function deleteUploads(urls: (string | null | undefined)[]): Promise<void> {
  const clean = [...new Set(urls.filter((u): u is string => !!u))];
  if (clean.length === 0) return;
  const sb = supabase();

  if (sb) {
    const keys = clean
      .map((u) => u.split(`/object/public/${BUCKET}/`)[1] ?? u.split(`/${BUCKET}/`).pop())
      .filter((k): k is string => !!k && !k.startsWith("http"));
    if (keys.length) await sb.storage.from(BUCKET).remove(keys).catch(() => undefined);
    return;
  }

  const { unlink } = await import("node:fs/promises");
  for (const u of clean) {
    if (!u.startsWith("/uploads/")) continue;
    await unlink(join(process.cwd(), "public", u.replace(/^\//, ""))).catch(() => undefined);
  }
}
