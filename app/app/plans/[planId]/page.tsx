import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { resolveActor } from "@/lib/access/roles";
import { getStore } from "@/lib/db";
import { EditorClient } from "./EditorClient";

export default async function PlanEditorPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const store = getStore();
  const plan = await store.getPlan(planId);
  if (!plan) notFound();

  const [brand, items, assets, comments, annotations, sources] = await Promise.all([
    store.getBrand(plan.brandId),
    store.listItems(planId),
    store.listAssets(planId),
    store.listComments(planId),
    store.listAnnotations(planId),
    store.listSources(plan.brandId),
  ]);
  if (!brand) notFound();

  const driveReady =
    !!process.env.GOOGLE_API_KEY && sources.some((s) => s.kind === "drive_folder");

  const jar = await cookies();
  const actor = resolveActor(jar.get("ritim_actor")?.value) ?? { name: "Ekip", role: "yonetici" as const };

  return (
    <EditorClient
      plan={plan}
      brand={brand}
      items={items}
      assets={assets}
      comments={comments}
      annotations={annotations}
      actorName={actor.name}
      actorRole={actor.role}
      driveReady={driveReady}
    />
  );
}
