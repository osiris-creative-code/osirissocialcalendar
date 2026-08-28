import { cookies } from "next/headers";
import { canAddBrand, resolveActor } from "@/lib/access/roles";
import { getStore } from "@/lib/db";
import { BrandsGrid } from "@/components/team/BrandsGrid";

export default async function BrandsPage() {
  const jar = await cookies();
  const actor = resolveActor(jar.get("ritim_actor")?.value);
  const brands = await getStore().listBrands();

  return <BrandsGrid brands={brands} canAdd={actor ? canAddBrand(actor.role) : false} />;
}
