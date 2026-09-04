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
  "yayinda",
  "tamamlandi",
] as const;
export type Stage = (typeof STAGES)[number];

export const ITEM_TYPES = ["post", "story", "reel", "special"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const COMMENT_STAGES = ["internal", "brand"] as const;
export type CommentStage = (typeof COMMENT_STAGES)[number];

/** Which language a brand's captions are written in. */
export const CAPTION_LANGUAGES = ["tr", "en", "mixed"] as const;
export type CaptionLanguage = (typeof CAPTION_LANGUAGES)[number];

export const COMMENT_STATUSES = ["none", "approved", "changes"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

/* ------------------------------------------------------------------ *
 * Row shapes
 * ------------------------------------------------------------------ */
export type Media = {
  url: string;
  kind: "image" | "video";
  slideOrder: number;
  /** Poster frame for a video (grid thumbnail + <video poster>). */
  posterUrl?: string;
  /** false ⇒ browser likely can't play this file (MOV/AVI/…). Absent ⇒ playable. */
  webPlayable?: boolean;
  /** url is a Google Drive /preview link — play in an iframe, not <video>. */
  driveEmbed?: boolean;
};

export type Brand = {
  id: string;
  name: string;
  logoUrl: string;
  colorPrimary: string;
  colorAccent: string;
  instagramHandle: string | null;
  /** Uploaded screenshot of the brand's current feed, for AI feed analysis. */
  feedScreenshotUrl: string | null;
  /** WhatsApp number (free text, digits used for wa.me); null = none. */
  phone: string | null;
  /** Re-hosted thumbnails from the last automatic Instagram feed fetch. */
  feedThumbs: string[] | null;
  /** ISO timestamp of that fetch, for the 12h cache guard. */
  feedFetchedAt: string | null;
  status: "active" | "archived";
  /** Caption language for this brand's plans. Absent on older records ⇒ "tr". */
  captionLanguage?: CaptionLanguage;
  /**
   * How this brand posts, in the team's own words — "her gün story, 3 günde bir
   * post". Handed to the model as the authority when it proposes a plan, so the
   * cadence does not have to be retyped into every prompt.
   */
  contentRules?: string | null;
  createdByName: string;
  createdAt: string;
};

export type BrandSource = {
  id: string;
  brandId: string;
  kind: "drive_oauth" | "public_link" | "manual" | "drive_folder";
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
  /** ISO timestamp the uploaded files were swept from Storage; null = still kept. */
  mediaPurgedAt: string | null;
  /** This shoot's Google Drive folder link (per plan, not per brand). */
  driveFolderUrl: string | null;
  /** Separately-delivered reels — one Google Drive video-file link per entry. */
  reelLinks: string[];
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
  /** ISO timestamp this slot was marked published (stage "yayinda"); null = not yet. */
  publishedAt: string | null;
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
  /** false ⇒ browser likely can't play this video (MOV/AVI/…). Absent ⇒ playable. */
  webPlayable?: boolean;
  /** Captured poster frame for a video asset. */
  posterUrl?: string;
  /** url is a Google Drive /preview link — play in an iframe, not <video>. */
  driveEmbed?: boolean;
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
 * App-wide settings — the Geliştirici Ayarları screen writes these.
 * ------------------------------------------------------------------ */

export const LANGUAGES = ["tr", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/** An uploaded font face available to every brand. */
export type FontAsset = {
  id: string;
  /** Shown in the picker, e.g. "Gilroy Bold". */
  name: string;
  /** Public URL of the .woff2/.ttf/.otf file. */
  url: string;
  /** The family name pages reference; derived from `name` unless overridden. */
  family: string;
  /** Characters the file actually contains, used for the Turkish fallback. */
  supportsTurkish: boolean;
  uploadedAt: string;
};

export type BackgroundSettings = {
  /** null = no image, just the colour behind it. */
  imageUrl: string | null;
  /** 0-100 — how visible the image is over the colour. */
  opacity: number;
  /** 0-40 px of blur, so a busy photo does not fight the content. */
  blur: number;
  /** Shows through wherever the image is transparent or faded. */
  color: string;
};

export type AppSettings = {
  /** Replaces the "Osiris" wordmark; transparent PNG/SVG. */
  logoUrl: string | null;
  background: BackgroundSettings;
  /** Fonts uploaded once, then assigned per brand. */
  fonts: FontAsset[];
  defaultLanguage: Language;
  /** Days after a plan ends before its media is swept. */
  mediaRetentionDays: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  logoUrl: null,
  background: { imageUrl: null, opacity: 35, blur: 8, color: "#1b1714" },
  fonts: [],
  defaultLanguage: "tr",
  mediaRetentionDays: 14,
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
  posterUrl: z.string().optional(),
  webPlayable: z.boolean().optional(),
  driveEmbed: z.boolean().optional(),
});

export const zBrand = z.object({
  id: z.string(),
  name: z.string().min(1),
  logoUrl: z.string(),
  colorPrimary: z.string(),
  colorAccent: z.string(),
  instagramHandle: z.string().nullable(),
  feedScreenshotUrl: z.string().nullable(),
  phone: z.string().nullable(),
  feedThumbs: z.array(z.string()).nullable(),
  feedFetchedAt: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  captionLanguage: z.enum(CAPTION_LANGUAGES).optional(),
  contentRules: z.string().nullable().optional(),
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
  mediaPurgedAt: z.string().nullable(),
  driveFolderUrl: z.string().nullable(),
  reelLinks: z.array(z.string()),
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
  publishedAt: z.string().nullable(),
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
