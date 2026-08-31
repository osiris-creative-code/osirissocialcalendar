import { json, requireEditor } from "@/lib/api/session";
import { putUpload } from "@/lib/uploads";

const MAX_BYTES = 6 * 1024 * 1024; // logos / small images

/** Server-side upload for small files (brand logos). Multipart: field `file`. */
export async function POST(req: Request) {
  const actor = requireEditor(req);
  if (actor instanceof Response) return actor;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "file required" }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ error: "dosya çok büyük (en fazla 6 MB)" }, 400);
  }

  try {
    const { url } = await putUpload({
      name: file.name,
      contentType: file.type || "application/octet-stream",
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return json({ url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "yükleme başarısız" }, 502);
  }
}
