import { hasDeveloper, json } from "@/lib/api/session";
import { storageDiag } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  if (!hasDeveloper(req)) return json({ error: "developer only" }, 403);
  try {
    return json(await storageDiag());
  } catch (e) {
    return json({ ok: false, steps: [`beklenmeyen hata: ${(e as Error).message}`] }, 500);
  }
}
