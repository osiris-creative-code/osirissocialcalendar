import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { NewPlanForm } from "@/components/team/NewPlanForm";

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const store = getStore();
  const brand = await store.getBrand(brandId);
  if (!brand) notFound();
  const sources = await store.listSources(brandId);

  return <NewPlanForm brandId={brandId} sources={sources} />;
}
