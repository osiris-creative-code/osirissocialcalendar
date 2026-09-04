import type { CaptionLanguage, ItemType } from "@/lib/types";

export type CaptionItem = {
  date: string;
  type: ItemType;
  specialLabel: string | null;
  /** http(s) URL of the item's first image — used for vision when available. */
  imageUrl?: string | null;
};

export type CaptionRequest = {
  brandName: string;
  tone: string;
  items: CaptionItem[];
  /** Short bullet insights about the brand's current feed, folded into the prompt. */
  feedInsights?: string[] | null;
  /** When true, image URLs are sent to the model as vision input. */
  vision?: boolean;
  /** Brand's caption language; defaults to Turkish when absent. */
  language?: CaptionLanguage;
};

export type CaptionResult = {
  /** Same length and order as `request.items`; `null` for story items. */
  captions: (string | null)[];
};

export type RewriteRequest = {
  brandName: string;
  tone: string;
  type: ItemType;
  current: string;
  /** Optional short steer, e.g. "kısalt", "daha eğlenceli". */
  instruction?: string;
  imageUrl?: string | null;
  vision?: boolean;
  feedInsights?: string[] | null;
  language?: CaptionLanguage;
};

export type AnalyzeFeedRequest = {
  brandName: string;
  handle: string | null;
  imageUrls: string[];
};

export type AnalyzeFeedResult = {
  /** 3–6 short Turkish bullets: palette, tone, recurring themes, gaps. */
  insights: string[];
};

export type SuggestPlanRequest = {
  brandName: string;
  rangeStart: string;
  rangeEnd: string;
  /** Real asset counts — post is carousel-group count. */
  counts: { post: number; story: number; reel: number };
  /** A ready parser-friendly cadence brief computed from the counts. */
  cadenceBrief: string;
  /** Sample image URLs for vision (special-day graphics, tone). */
  imageUrls: string[];
  /** The brand's standing cadence rules, if the team wrote any. */
  contentRules?: string | null;
};

export type SuggestPlanResult = {
  /** Full Turkish brief to drop into the plan prompt. */
  prompt: string;
  /** One short line on what was found. */
  note: string;
};

/* ------------------------------------------------------------------ *
 * Shoot analysis — "these look alike, make them a carousel"
 * ------------------------------------------------------------------ */

/** One candidate group found by the cheap server-side pass, sent for judgement. */
export type SimilarCandidate = {
  id: string;
  type: ItemType;
  /** Asset ids in the group, in upload order. */
  assetIds: string[];
  /** One image URL per asset, same order (may be empty when not remote). */
  imageUrls: string[];
  names: string[];
};

export type GroupSimilarRequest = {
  brandName: string;
  candidates: SimilarCandidate[];
};

export type GroupSimilarVerdict = {
  candidateId: string;
  /** "carousel" ⇒ same shoot, merge into one carousel post.
   *  "spread"   ⇒ alike but separate posts — keep apart on the calendar.
   *  "unrelated" ⇒ false alarm, drop the suggestion. */
  verdict: "carousel" | "spread" | "unrelated";
  /** One short Turkish sentence explaining the call. */
  reason: string;
};

export type GroupSimilarResult = { verdicts: GroupSimilarVerdict[] };

/* ------------------------------------------------------------------ *
 * Calendar review — the pass before it goes to internal approval
 * ------------------------------------------------------------------ */

export type ReviewCalendarRequest = {
  brandName: string;
  rangeStart: string;
  rangeEnd: string;
  /** Compact per-item lines: date · type · caption. */
  items: { date: string; type: ItemType; caption: string | null }[];
  /** Deterministic findings computed server-side, for the model to judge and phrase. */
  facts: string[];
  language?: CaptionLanguage;
};

export type ReviewNote = {
  kind: "similar-too-close" | "balance" | "caption-repeat" | "special-day";
  severity: "info" | "warn";
  /** One short Turkish sentence the team can act on. */
  message: string;
};

export type ReviewCalendarResult = { notes: ReviewNote[] };

export interface AIClient {
  captions(req: CaptionRequest): Promise<CaptionResult>;
  rewriteCaption(req: RewriteRequest): Promise<{ caption: string }>;
  analyzeFeed(req: AnalyzeFeedRequest): Promise<AnalyzeFeedResult>;
  suggestPlan(req: SuggestPlanRequest): Promise<SuggestPlanResult>;
  groupSimilar(req: GroupSimilarRequest): Promise<GroupSimilarResult>;
  reviewCalendar(req: ReviewCalendarRequest): Promise<ReviewCalendarResult>;
}
