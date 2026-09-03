import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { BrandDetail } from "@/components/team/BrandDetail";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const store = getStore();
  const brand = await store.getBrand(brandId);
  if (!brand) notFound();

  const plans = await store.listPlans({ brandId });

  return <BrandDetail brand={brand} plans={plans} />;
}
