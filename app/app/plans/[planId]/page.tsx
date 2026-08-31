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

  const [brand, items, assets, comments, annotations] = await Promise.all([
    store.getBrand(plan.brandId),
    store.listItems(planId),
    store.listAssets(planId),
    store.listComments(planId),
    store.listAnnotations(planId),
  ]);
  if (!brand) notFound();

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
    />
  );
}
