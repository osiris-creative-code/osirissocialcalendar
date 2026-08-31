import Link from "next/link";
import { getStore } from "@/lib/db";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/plan-stages";
import { trRange } from "@/lib/format";
import { StageBadge } from "@/components/team/StageBadge";

export default async function QueuePage() {
  const store = getStore();
  const [plans, brands] = await Promise.all([store.listPlans(), store.listBrands({ includeArchived: true })]);
  const brandName = new Map(brands.map((b) => [b.id, b.name]));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Onay kuyruğu</h1>

      {STAGE_ORDER.map((stage) => {
        const group = plans.filter((p) => p.stage === stage);
        if (group.length === 0) return null;
        return (
          <section
            key={stage}
            className={`rounded-[var(--r-lg)] border p-4 ${
              stage === "ic_onayda"
                ? "border-[color-mix(in_srgb,var(--warn)_45%,transparent)] bg-[var(--warn-soft)]"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
              <StageBadge stage={stage} />
              <span className="text-[var(--text-mute)]">{group.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {group.map((p) => (
                <Link
                  key={p.id}
                  href={`/app/plans/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 hover:border-[var(--border-strong)]"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{brandName.get(p.brandId) ?? "—"}</span>
                    <span className="text-[var(--text-dim)]">{p.title}</span>
                    <span className="font-mono text-[12px] text-[var(--text-mute)]">
                      {trRange(p.rangeStart, p.rangeEnd)}
                    </span>
                    {p.reviseDeadline &&
                      p.stage === "markada" &&
                      p.reviseDeadline < new Date().toISOString().slice(0, 10) && (
                        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                          ⏰ süre doldu
                        </span>
                      )}
                  </span>
                  <span className="text-[12px] text-[var(--text-mute)]">{STAGE_LABELS[stage]}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {plans.length === 0 && <p className="text-[14px] text-[var(--text-mute)]">Henüz plan yok.</p>}
    </div>
  );
}
