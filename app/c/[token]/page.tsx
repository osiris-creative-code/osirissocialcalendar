import { getStore } from "@/lib/db";
import { trRange } from "@/lib/format";
import { InvalidLink } from "@/components/InvalidLink";
import { BrandViewClient } from "./BrandViewClient";

export default async function BrandCalendarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const store = getStore();
  const plan = await store.getPlanByToken("public", token);
  if (!plan || plan.publicToken !== token) return <InvalidLink />;

  const [brand, items, comments, annotations, versions] = await Promise.all([
    store.getBrand(plan.brandId),
    store.listItems(plan.id),
    store.listComments(plan.id),
    store.listAnnotations(plan.id),
    store.listVersions(plan.id),
  ]);
  if (!brand) return <InvalidLink />;

  const splashTitle = `${trRange(plan.rangeStart, plan.rangeEnd)} Sosyal Medya Paylaşım Takvimi`;
  const published = versions
    .filter((v) => v.label === "İlk yayın" || v.label === "Revizyon yayını")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 2);

  return (
    <BrandViewClient
      plan={plan}
      brand={brand}
      items={items}
      comments={comments}
      annotations={annotations}
      splashTitle={splashTitle}
      publishedVersions={published}
    />
  );
}
