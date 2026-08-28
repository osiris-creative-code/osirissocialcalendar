import { getAI } from "@/lib/ai";
import { planFromPrompt, type DraftItem } from "@/lib/planner";
import { MockDriveSource } from "@/lib/sources/mock-drive";
import type { Brand, Plan } from "@/lib/types";
import type { NewItem } from "@/lib/data/store";

/** Fixed demo asset counts used while Drive is mocked (Phase 1). */
export const DEMO_SOURCE_CONFIG = { postCount: 5, storyCount: 8, reelCount: 2 };

export type GenerateOutput = {
  ruleCount: number;
  gap: boolean;
  extendItems: NewItem[];
  stopItems: NewItem[];
};

export async function runGenerate(plan: Plan, brand: Brand): Promise<GenerateOutput> {
  const assets = await new MockDriveSource(DEMO_SOURCE_CONFIG).list();
  const { rules, extend, stopAtAssets, gap } = planFromPrompt(
    plan.prompt,
    plan.rangeStart,
    plan.rangeEnd,
    assets,
  );
  const assetById = new Map(assets.map((a) => [a.id, a]));
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
    return drafts.map((d, idx) => ({
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
    }));
  };

  return {
    ruleCount: rules.length,
    gap,
    extendItems: await toItems(extend),
    stopItems: await toItems(stopAtAssets),
  };
}
