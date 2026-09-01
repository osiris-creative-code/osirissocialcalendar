import type {
  ActivityEntry,
  Annotation,
  Brand,
  BrandSource,
  Comment,
  Plan,
  PlanAsset,
  PlanItem,
  PlanTheme,
  PlanVersion,
  Stage,
} from "@/lib/types";

export type { PlanVersion } from "@/lib/types";

export type DbShape = {
  brands: Brand[];
  sources: BrandSource[];
  plans: Plan[];
  items: PlanItem[];
  assets: PlanAsset[];
  versions: PlanVersion[];
  comments: Comment[];
  annotations: Annotation[];
  activity: ActivityEntry[];
};

export type CreateBrandInput = {
  name: string;
  logoUrl: string;
  colorPrimary: string;
  colorAccent: string;
  instagramHandle: string | null;
  createdByName: string;
};

export type CreateSourceInput = Omit<BrandSource, "id">;

export type CreatePlanInput = {
  brandId: string;
  title: string;
  rangeStart: string;
  rangeEnd: string;
  prompt: string;
  theme: PlanTheme;
  visionEnabled?: boolean;
};

export type NewItem = Omit<PlanItem, "id" | "planId" | "publishedAt">;
export type NewAsset = Omit<PlanAsset, "id" | "planId" | "sort">;

export type AddCommentInput = Omit<Comment, "id" | "createdAt">;
export type AddAnnotationInput = Omit<Annotation, "id" | "createdAt">;
export type LogActivityInput = Omit<ActivityEntry, "id" | "createdAt">;

export interface DataStore {
  listBrands(opts?: { includeArchived?: boolean }): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | null>;
  createBrand(input: CreateBrandInput): Promise<Brand>;
  updateBrand(id: string, patch: Partial<Brand>): Promise<Brand>;

  listSources(brandId: string): Promise<BrandSource[]>;
  createSource(input: CreateSourceInput): Promise<BrandSource>;

  getPlan(id: string): Promise<Plan | null>;
  getPlanByToken(kind: "internal" | "public", token: string): Promise<Plan | null>;
  listPlans(opts?: { brandId?: string; stages?: Stage[] }): Promise<Plan[]>;
  createPlan(input: CreatePlanInput): Promise<Plan>;
  updatePlan(id: string, patch: Partial<Plan>): Promise<Plan>;
  deletePlan(id: string): Promise<void>;
  purgePlanMedia(id: string): Promise<{ urls: string[] }>;

  listItems(planId: string): Promise<PlanItem[]>;
  replaceItems(planId: string, items: NewItem[]): Promise<PlanItem[]>;
  updateItem(id: string, patch: Partial<PlanItem>): Promise<PlanItem>;

  listAssets(planId: string): Promise<PlanAsset[]>;
  addAssets(planId: string, assets: NewAsset[]): Promise<PlanAsset[]>;
  deleteAsset(id: string): Promise<void>;

  listVersions(planId: string): Promise<PlanVersion[]>;
  snapshotPlan(planId: string, label: string, actorName: string): Promise<PlanVersion>;

  listComments(planId: string): Promise<Comment[]>;
  addComment(input: AddCommentInput): Promise<Comment>;

  listAnnotations(planId: string): Promise<Annotation[]>;
  addAnnotation(input: AddAnnotationInput): Promise<Annotation>;
  deleteAnnotation(id: string): Promise<void>;

  listActivity(planId: string): Promise<ActivityEntry[]>;
  logActivity(input: LogActivityInput): Promise<ActivityEntry>;
}
