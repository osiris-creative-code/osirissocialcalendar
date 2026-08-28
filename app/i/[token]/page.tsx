import { getStore } from "@/lib/db";
import { trRange } from "@/lib/format";
import { InvalidLink } from "@/components/InvalidLink";
import { InternalClient } from "./InternalClient";

export default async function InternalPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const store = getStore();
  const plan = await store.getPlanByToken("internal", token);
  if (!plan) return <InvalidLink />;

  const [brand, items, comments, annotations] = await Promise.all([
    store.getBrand(plan.brandId),
    store.listItems(plan.id),
    store.listComments(plan.id),
    store.listAnnotations(plan.id),
  ]);
  if (!brand) return <InvalidLink />;

  const title = `${trRange(plan.rangeStart, plan.rangeEnd)} Sosyal Medya Paylaşım Takvimi`;

  return (
    <InternalClient
      plan={plan}
      brand={brand}
      items={items}
      comments={comments}
      annotations={annotations}
      title={title}
    />
  );
}
