import { getAI } from "@/lib/ai";
import { visionSafeUrl } from "@/lib/ai/vision-safe";
import { getStore } from "@/lib/db";
import { planFromPrompt, type DraftItem } from "@/lib/planner";
import { MockDriveSource } from "@/lib/sources/mock-drive";
import type { Asset } from "@/lib/sources/types";
import type { Brand, Plan } from "@/lib/types";
import type { NewItem } from "@/lib/data/store";
import { captionLanguageOf } from "@/lib/caption-language";

/** Fixed demo asset counts, used only when a plan has no uploaded content. */
export const DEMO_SOURCE_CONFIG = { postCount: 5, storyCount: 8, reelCount: 2 };

export type GeneratePreview = {
  ruleCount: number;
  gap: boolean;
  usingRealAssets: boolean;
  extendCount: number;
  stopCount: number;
};

export type GenerateResult = {
  gap: boolean;
  items: NewItem[];
};

async function buildDrafts(plan: Plan) {
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
        posterUrl: a.posterUrl,
        webPlayable: a.webPlayable,
        driveEmbed: a.driveEmbed,
      }))
    : await new MockDriveSource(DEMO_SOURCE_CONFIG).list();

  const parsed = planFromPrompt(plan.prompt, plan.rangeStart, plan.rangeEnd, assets);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const placeholderIds = new Set(uploaded.filter((a) => a.placeholder).map((a) => a.id));
  return { ...parsed, assetById, placeholderIds, usingRealAssets: uploaded.length > 0 };
}

/** Counts only — no AI call. */
export async function previewGenerate(plan: Plan): Promise<GeneratePreview> {
  const d = await buildDrafts(plan);
  return {
    ruleCount: d.rules.length,
    gap: d.gap,
    usingRealAssets: d.usingRealAssets,
    extendCount: d.extend.length,
    stopCount: d.stopAtAssets.length,
  };
}

/** Above this many drafts, vision stops attaching images — keeps one big shoot's
 *  worth of items from turning into a single huge (slow, expensive) vision call. */
const MAX_VISION_ITEMS = 15;

/** Builds the chosen item set and writes captions — one AI call. */
export async function runGenerate(
  plan: Plan,
  brand: Brand,
  mode: "extend" | "stopAtAssets",
): Promise<GenerateResult> {
  const d = await buildDrafts(plan);
  const drafts: DraftItem[] = mode === "stopAtAssets" ? d.stopAtAssets : d.extend;
  const vision = plan.visionEnabled && drafts.length <= MAX_VISION_ITEMS;

  const { captions } = await getAI().captions({
    brandName: brand.name,
    tone: "sıcak",
    language: captionLanguageOf(brand),
    feedInsights: plan.feedInsights,
    vision,
    items: drafts.map((x) => ({
      date: x.date,
      type: x.type,
      specialLabel: x.specialLabel,
      imageUrl: vision ? visionSafeUrl(d.assetById.get(x.assetIds[0] ?? "")?.url) : null,
    })),
  });

  const items: NewItem[] = drafts.map((x, idx) => ({
    date: x.date,
    type: x.type,
    sort: idx,
    caption: x.type === "story" || x.isGap ? null : captions[idx],
    specialLabel: x.specialLabel,
    media: x.assetIds.map((id) => {
      const a = d.assetById.get(id)!;
      return {
        url: a.url,
        kind: a.kind,
        slideOrder: a.slideOrder,
        ...(a.posterUrl ? { posterUrl: a.posterUrl } : {}),
        ...(a.webPlayable === false ? { webPlayable: false } : {}),
        ...(a.driveEmbed ? { driveEmbed: true } : {}),
      };
    }),
    isGap: x.isGap,
    hidden: false,
    placeholder: x.assetIds.some((id) => d.placeholderIds.has(id)),
  }));

  return { gap: d.gap, items };
}
