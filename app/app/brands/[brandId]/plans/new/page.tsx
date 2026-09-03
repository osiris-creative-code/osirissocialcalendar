import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { NewPlanForm } from "@/components/team/NewPlanForm";

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const brand = await getStore().getBrand(brandId);
  if (!brand) notFound();

  return <NewPlanForm brandId={brandId} />;
}
