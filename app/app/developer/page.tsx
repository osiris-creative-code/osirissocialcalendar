import { cookies } from "next/headers";
import { getStore } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/access/roles";
import { DevGate } from "@/components/team/DevGate";
import { BrandArchiveList } from "@/components/team/BrandArchiveList";
import { StorageCheck } from "@/components/team/StorageCheck";
import type { ActivityEntry } from "@/lib/types";

export default async function DeveloperPage() {
  const jar = await cookies();
  if (jar.get("ritim_dev")?.value !== "1") return <DevGate />;

  const store = getStore();
  const brands = await store.listBrands({ includeArchived: true });
  const plans = await store.listPlans();
  const activity: ActivityEntry[] = (
    await Promise.all(plans.map((p) => store.listActivity(p.id)))
  )
    .flat()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 100);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Developer</h1>

      <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
          Markalar (arşiv dahil)
        </h2>
        <BrandArchiveList brands={brands} />
      </section>

      <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 text-[12.5px] text-[var(--text-dim)]">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">Ayarlar</h2>
        <p>Ekip kodu: <code className="font-mono">OSIRIS_TEAM_TOKEN</code> (env)</p>
        <p>Developer şifresi: <code className="font-mono">OSIRIS_DEV_PASSWORD</code> (env)</p>
        <p>
          AI:{" "}
          {process.env.OPENAI_API_KEY
            ? "canlı (OpenAI)"
            : process.env.ANTHROPIC_API_KEY
              ? "canlı (Anthropic)"
              : "MockAI (anahtar yok)"}{" "}
          · model{" "}
          <code className="font-mono">
            {process.env.OSIRIS_AI_MODEL ??
              (process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "claude-sonnet-5")}
          </code>
          <br />
          <code className="font-mono">OPENAI_API_KEY</code> veya{" "}
          <code className="font-mono">ANTHROPIC_API_KEY</code> + opsiyonel{" "}
          <code className="font-mono">OSIRIS_AI_MODEL</code> ile ayarlanır
        </p>
        <p className="mt-2">
          Drive&apos;dan içe aktarma:{" "}
          {process.env.GOOGLE_API_KEY ? "açık" : "kapalı"} (
          <code className="font-mono">GOOGLE_API_KEY</code>)
        </p>
        <p>
          Otomatik dosya temizliği:{" "}
          {process.env.CRON_SECRET ? "açık" : "kapalı — CRON_SECRET yok"}
        </p>
        <StorageCheck />
      </section>

      <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
          İşlem kaydı
        </h2>
        <div className="flex flex-col gap-1 font-mono text-[11.5px] text-[var(--text-dim)]">
          {activity.length === 0 && <span className="text-[var(--text-mute)]">Kayıt yok.</span>}
          {activity.map((a) => (
            <div key={a.id}>
              {a.createdAt.slice(0, 16).replace("T", " ")} · {a.actorName} ({ROLE_LABELS[a.actorRole]}) ·{" "}
              {a.action}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
