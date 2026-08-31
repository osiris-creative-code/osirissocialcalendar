import { z } from "zod";

/* ------------------------------------------------------------------ *
 * String unions — the single source of truth (spec §Global Constraints)
 * ------------------------------------------------------------------ */
export const ROLES = ["developer", "yonetici", "onaylayan", "marka"] as const;
export type Role = (typeof ROLES)[number];

export const STAGES = [
  "taslak",
  "ic_onayda",
  "markaya_hazir",
  "markada",
  "revize_istendi",
  "onaylandi",
] as const;
export type Stage = (typeof STAGES)[number];

export const ITEM_TYPES = ["post", "story", "reel", "special"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const COMMENT_STAGES = ["internal", "brand"] as const;
export type CommentStage = (typeof COMMENT_STAGES)[number];

export const COMMENT_STATUSES = ["none", "approved", "changes"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

/* ------------------------------------------------------------------ *
 * Row shapes
 * ------------------------------------------------------------------ */
export type Media = { url: string; kind: "image" | "video"; slideOrder: number };

export type Brand = {
  id: string;
  name: string;
  logoUrl: string;
  colorPrimary: string;
  colorAccent: string;
  instagramHandle: string | null;
  status: "active" | "archived";
  createdByName: string;
  createdAt: string;
};

export type BrandSource = {
  id: string;
  brandId: string;
  kind: "drive_oauth" | "public_link" | "manual";
  label: string;
  config: Record<string, unknown>;
};

export type PlanTheme = { primary: string; accent: string };

export type Plan = {
  id: string;
  brandId: string;
  title: string;
  rangeStart: string;
  rangeEnd: string;
  prompt: string;
  stage: Stage;
  theme: PlanTheme;
  internalToken: string;
  publicToken: string | null;
  version: number;
  lastActorName: string | null;
  createdAt: string;
  /** Send images to the model when generating/rewriting captions. */
  visionEnabled: boolean;
  /** Bullet insights from analysing the brand's current feed. */
  feedInsights: string[] | null;
  /** Date (YYYY-MM-DD) the brand's review is due; null = none. */
  reviseDeadline: string | null;
};

export type PlanVersion = {
  id: string;
  planId: string;
  version: number;
  label: string;
  actorName: string;
  items: PlanItem[];
  createdAt: string;
};

export type PlanItem = {
  id: string;
  planId: string;
  date: string;
  type: ItemType;
  sort: number;
  caption: string | null;
  specialLabel: string | null;
  media: Media[];
  isGap: boolean;
  hidden: boolean;
  /** Shown to the brand as "hazırlanıyor" — a real slot whose file isn't ready. */
  placeholder?: boolean;
};

export type PlanAsset = {
  id: string;
  planId: string;
  type: ItemType;
  kind: "image" | "video";
  url: string;
  name: string;
  slideGroup: string | null;
  slideOrder: number;
  sort: number;
  /** A reserved slot with no file yet (e.g. a reel still being edited). */
  placeholder?: boolean;
};

export type Comment = {
  id: string;
  planItemId: string;
  stage: CommentStage;
  authorName: string;
  authorRole: Role;
  body: string;
  status: CommentStatus;
  createdAt: string;
};

export type Annotation = {
  id: string;
  planItemId: string;
  mediaIndex: number;
  xPct: number;
  yPct: number;
  note: string;
  stage: CommentStage;
  authorName: string;
  createdAt: string;
};

export type ActivityEntry = {
  id: string;
  planId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

/* ------------------------------------------------------------------ *
 * zod schemas (used by API route input validation)
 * ------------------------------------------------------------------ */
const zRole = z.enum(ROLES);
const zStage = z.enum(STAGES);
const zItemType = z.enum(ITEM_TYPES);
const zCommentStage = z.enum(COMMENT_STAGES);
const zMedia = z.object({
  url: z.string(),
  kind: z.enum(["image", "video"]),
  slideOrder: z.number(),
});

export const zBrand = z.object({
  id: z.string(),
  name: z.string().min(1),
  logoUrl: z.string(),
  colorPrimary: z.string(),
  colorAccent: z.string(),
  instagramHandle: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  createdByName: z.string(),
  createdAt: z.string(),
});

export const zPlanTheme = z.object({ primary: z.string(), accent: z.string() });

export const zPlan = z.object({
  id: z.string(),
  brandId: z.string(),
  title: z.string().min(1),
  rangeStart: z.string(),
  rangeEnd: z.string(),
  prompt: z.string(),
  stage: zStage,
  theme: zPlanTheme,
  internalToken: z.string(),
  publicToken: z.string().nullable(),
  version: z.number(),
  lastActorName: z.string().nullable(),
  createdAt: z.string(),
  visionEnabled: z.boolean(),
  feedInsights: z.array(z.string()).nullable(),
  reviseDeadline: z.string().nullable(),
});

export const zPlanItem = z.object({
  id: z.string(),
  planId: z.string(),
  date: z.string(),
  type: zItemType,
  sort: z.number(),
  caption: z.string().nullable(),
  specialLabel: z.string().nullable(),
  media: z.array(zMedia),
  isGap: z.boolean(),
  hidden: z.boolean(),
  placeholder: z.boolean().optional(),
});

export const zComment = z.object({
  planItemId: z.string(),
  stage: zCommentStage,
  authorName: z.string().min(1),
  authorRole: zRole,
  body: z.string(),
  status: z.enum(COMMENT_STATUSES),
});

export const zAnnotation = z.object({
  planItemId: z.string(),
  mediaIndex: z.number(),
  xPct: z.number(),
  yPct: z.number(),
  note: z.string(),
  stage: zCommentStage,
  authorName: z.string().min(1),
});

export { newId } from "./ids";
export { newToken } from "./tokens";
