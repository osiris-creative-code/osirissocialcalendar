import { getAI } from "@/lib/ai";
import { getStore } from "@/lib/db";
import { planFromPrompt, type DraftItem } from "@/lib/planner";
import { MockDriveSource } from "@/lib/sources/mock-drive";
import type { Asset } from "@/lib/sources/types";
import type { Brand, Plan } from "@/lib/types";
import type { NewItem } from "@/lib/data/store";

/** Fixed demo asset counts, used only when a plan has no uploaded content. */
export const DEMO_SOURCE_CONFIG = { postCount: 5, storyCount: 8, reelCount: 2 };

export type GenerateOutput = {
  ruleCount: number;
  gap: boolean;
  usingRealAssets: boolean;
  extendItems: NewItem[];
  stopItems: NewItem[];
};

export async function runGenerate(plan: Plan, brand: Brand): Promise<GenerateOutput> {
  const uploaded = await getStore().listAssets(plan.id);
  const assets: Asset[] = uploaded.length
    ? uploaded.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        kind: a.kind,
        url: a.url,
        slideGroup: a.slideGroup ?? undefined,
        slideOrder: a.slideOrder,
      }))
    : await new MockDriveSource(DEMO_SOURCE_CONFIG).list();

  const { rules, extend, stopAtAssets, gap } = planFromPrompt(
    plan.prompt,
    plan.rangeStart,
    plan.rangeEnd,
    assets,
  );
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const placeholderIds = new Set(uploaded.filter((a) => a.placeholder).map((a) => a.id));
  const ai = getAI();

  const toItems = async (drafts: DraftItem[]): Promise<NewItem[]> => {
    const { captions } = await ai.captions({
      brandName: brand.name,
      tone: "sıcak",
      feedInsights: plan.feedInsights,
      vision: plan.visionEnabled,
      items: drafts.map((d) => ({
        date: d.date,
        type: d.type,
        specialLabel: d.specialLabel,
        imageUrl: assetById.get(d.assetIds[0] ?? "")?.url ?? null,
      })),
    });
    return drafts.map((d, idx) => {
      const isPlaceholder = d.assetIds.some((id) => placeholderIds.has(id));
      return {
        date: d.date,
        type: d.type,
        sort: idx,
        caption: d.type === "story" || d.isGap ? null : captions[idx],
        specialLabel: d.specialLabel,
        media: d.assetIds.map((id) => {
          const a = assetById.get(id)!;
          return { url: a.url, kind: a.kind, slideOrder: a.slideOrder };
        }),
        isGap: d.isGap,
        hidden: false,
        placeholder: isPlaceholder,
      };
    });
  };

  return {
    ruleCount: rules.length,
    gap,
    usingRealAssets: uploaded.length > 0,
    extendItems: await toItems(extend),
    stopItems: await toItems(stopAtAssets),
  };
}
