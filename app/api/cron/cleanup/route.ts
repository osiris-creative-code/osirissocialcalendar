import { getStore, storeIsPersistent } from "@/lib/db";
import { json } from "@/lib/api/session";
import { deleteUploads } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Files are swept this many days after the plan's date range ends. */
const RETENTION_DAYS = 14;

/**
 * Daily housekeeping (Vercel Cron -> see `vercel.json`).
 * Deletes the uploaded images/videos of any plan whose `rangeEnd` was more than
 * RETENTION_DAYS ago. The plan, captions, comments and activity stay — only the
 * binary files (which is all that costs Storage quota) go.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
 * In production `CRON_SECRET` must be set or the route refuses to run.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return json({ error: "unauthorized" }, 401);
    }
  } else if (storeIsPersistent()) {
    return json({ error: "CRON_SECRET is not set — refusing to run in production" }, 403);
  }

  const store = getStore();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const plans = await store.listPlans();

  const purged: { id: string; title: string; rangeEnd: string; files: number }[] = [];
  let files = 0;

  for (const plan of plans) {
    if (plan.mediaPurgedAt) continue;
    const endsAt = new Date(`${plan.rangeEnd}T23:59:59Z`).getTime();
    if (Number.isNaN(endsAt) || endsAt >= cutoff) continue;

    const { urls } = await store.purgePlanMedia(plan.id);
    await deleteUploads(urls);
    files += urls.length;
    purged.push({ id: plan.id, title: plan.title, rangeEnd: plan.rangeEnd, files: urls.length });

    await store.logActivity({
      planId: plan.id,
      actorName: "sistem",
      actorRole: "yonetici",
      action: "medya_temizlendi",
      meta: { files: urls.length, retentionDays: RETENTION_DAYS },
    });
  }

  return json({ ok: true, retentionDays: RETENTION_DAYS, plans: purged.length, files, purged });
}
