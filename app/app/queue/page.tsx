import { cookies } from "next/headers";
import { resolveActor } from "@/lib/access/roles";
import { getStore } from "@/lib/db";
import { STAGE_ORDER } from "@/lib/plan-stages";
import { publishStats } from "@/lib/publish";
import { StageBadge } from "@/components/team/StageBadge";
import { QueueRow } from "@/components/team/QueueRow";

export default async function QueuePage() {
  const store = getStore();
  const [plans, brands] = await Promise.all([
    store.listPlans(),
    store.listBrands({ includeArchived: true }),
  ]);
  const brandName = new Map(brands.map((b) => [b.id, b.name]));

  const liveStages = new Set(["yayinda", "tamamlandi"]);
  const statsByPlan = new Map(
    await Promise.all(
      plans
        .filter((p) => liveStages.has(p.stage))
        .map(async (p) => [p.id, publishStats(await store.listItems(p.id))] as const),
    ),
  );

  const feedbackByPlan = new Map(
    await Promise.all(
      plans
        .filter((p) => p.stage === "revize_istendi")
        .map(async (p) => {
          const [comments, annotations] = await Promise.all([
            store.listComments(p.id),
            store.listAnnotations(p.id),
          ]);
          return [p.id, comments.length + annotations.length] as const;
        }),
    ),
  );

  const jar = await cookies();
  const actor = resolveActor(jar.get("ritim_actor")?.value) ?? { name: "Ekip", role: "yonetici" as const };

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
                : stage === "revize_istendi"
                  ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
              <StageBadge stage={stage} />
              <span className="text-[var(--text-mute)]">{group.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {group.map((p) => (
                <QueueRow
                  key={p.id}
                  plan={p}
                  brandName={brandName.get(p.brandId) ?? "—"}
                  actor={actor}
                  stats={statsByPlan.get(p.id)}
                  feedbackCount={feedbackByPlan.get(p.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {plans.length === 0 && <p className="text-[14px] text-[var(--text-mute)]">Henüz plan yok.</p>}
    </div>
  );
}
