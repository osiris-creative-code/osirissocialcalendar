import { getStore } from "@/lib/db";
import { hasDeveloper, json } from "@/lib/api/session";
import { DEFAULT_SETTINGS, LANGUAGES, type AppSettings } from "@/lib/types";

/** Anyone in the team may read them — the logo, background and fonts are used
 *  to render every page. Only a developer may write. */
export async function GET() {
  return json(await getStore().getSettings());
}

const clamp = (n: unknown, lo: number, hi: number, fallback: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;

export async function PATCH(req: Request) {
  if (!hasDeveloper(req)) return json({ error: "forbidden" }, 403);

  const body = (await req.json().catch(() => null)) as Partial<AppSettings> | null;
  if (!body) return json({ error: "body required" }, 400);

  const current = await getStore().getSettings();
  const patch: Partial<AppSettings> = {};

  if ("logoUrl" in body) patch.logoUrl = body.logoUrl?.trim() || null;
  if ("mediaRetentionDays" in body) {
    patch.mediaRetentionDays = clamp(body.mediaRetentionDays, 1, 365, DEFAULT_SETTINGS.mediaRetentionDays);
  }
  if ("defaultLanguage" in body && (LANGUAGES as readonly string[]).includes(String(body.defaultLanguage))) {
    patch.defaultLanguage = body.defaultLanguage;
  }
  if (body.background) {
    patch.background = {
      imageUrl: body.background.imageUrl?.trim() || null,
      opacity: clamp(body.background.opacity, 0, 100, current.background.opacity),
      blur: clamp(body.background.blur, 0, 40, current.background.blur),
      color: body.background.color || current.background.color,
    };
  }
  if (Array.isArray(body.fonts)) patch.fonts = body.fonts;

  return json(await getStore().updateSettings(patch));
}
