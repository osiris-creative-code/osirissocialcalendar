import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { newId } from "@/lib/ids";
import { newToken } from "@/lib/tokens";
import type {
  ActivityEntry,
  Annotation,
  Brand,
  BrandSource,
  Comment,
  Plan,
  PlanItem,
  Stage,
} from "@/lib/types";
import { seedData } from "./seed";
import type {
  AddAnnotationInput,
  AddCommentInput,
  CreateBrandInput,
  CreatePlanInput,
  CreateSourceInput,
  DataStore,
  DbShape,
  LogActivityInput,
  NewItem,
} from "./store";

export class JsonStore implements DataStore {
  private db: DbShape;

  constructor(private path: string) {
    if (existsSync(path)) {
      this.db = JSON.parse(readFileSync(path, "utf8")) as DbShape;
    } else {
      this.db = seedData();
      this.flush();
    }
  }

  private flush() {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.db, null, 2));
  }

  private clone<T>(v: T): T {
    return JSON.parse(JSON.stringify(v)) as T;
  }

  /* ---------- brands ---------- */
  async listBrands(opts: { includeArchived?: boolean } = {}) {
    return this.clone(
      this.db.brands.filter((b) => opts.includeArchived || b.status === "active"),
    );
  }
  async getBrand(id: string) {
    return this.clone(this.db.brands.find((b) => b.id === id) ?? null);
  }
  async createBrand(input: CreateBrandInput): Promise<Brand> {
    const brand: Brand = {
      id: newId(),
      status: "active",
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.db.brands.push(brand);
    this.flush();
    return this.clone(brand);
  }
  async updateBrand(id: string, patch: Partial<Brand>): Promise<Brand> {
    const brand = this.db.brands.find((b) => b.id === id);
    if (!brand) throw new Error(`brand ${id} not found`);
    Object.assign(brand, patch, { id: brand.id });
    this.flush();
    return this.clone(brand);
  }

  /* ---------- sources ---------- */
  async listSources(brandId: string) {
    return this.clone(this.db.sources.filter((s) => s.brandId === brandId));
  }
  async createSource(input: CreateSourceInput): Promise<BrandSource> {
    const source: BrandSource = { id: newId(), ...input };
    this.db.sources.push(source);
    this.flush();
    return this.clone(source);
  }

  /* ---------- plans ---------- */
  async getPlan(id: string) {
    return this.clone(this.db.plans.find((p) => p.id === id) ?? null);
  }
  async getPlanByToken(kind: "internal" | "public", token: string) {
    const key = kind === "internal" ? "internalToken" : "publicToken";
    return this.clone(this.db.plans.find((p) => p[key] === token) ?? null);
  }
  async listPlans(opts: { brandId?: string; stages?: Stage[] } = {}) {
    return this.clone(
      this.db.plans.filter(
        (p) =>
          (!opts.brandId || p.brandId === opts.brandId) &&
          (!opts.stages || opts.stages.includes(p.stage)),
      ),
    );
  }
  async createPlan(input: CreatePlanInput): Promise<Plan> {
    const plan: Plan = {
      id: newId(),
      brandId: input.brandId,
      title: input.title,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      prompt: input.prompt,
      stage: "taslak",
      theme: input.theme,
      internalToken: newToken("i"),
      publicToken: null,
      version: 1,
      lastActorName: null,
      createdAt: new Date().toISOString(),
    };
    this.db.plans.push(plan);
    this.flush();
    return this.clone(plan);
  }
  async updatePlan(id: string, patch: Partial<Plan>): Promise<Plan> {
    const plan = this.db.plans.find((p) => p.id === id);
    if (!plan) throw new Error(`plan ${id} not found`);
    Object.assign(plan, patch, { id: plan.id });
    this.flush();
    return this.clone(plan);
  }

  /* ---------- items ---------- */
  async listItems(planId: string) {
    return this.clone(
      this.db.items.filter((i) => i.planId === planId).sort((a, b) => a.sort - b.sort),
    );
  }
  async replaceItems(planId: string, items: NewItem[]): Promise<PlanItem[]> {
    this.db.items = this.db.items.filter((i) => i.planId !== planId);
    const created: PlanItem[] = items.map((it) => ({ id: newId(), planId, ...it }));
    this.db.items.push(...created);
    this.flush();
    return this.clone(created);
  }
  async updateItem(id: string, patch: Partial<PlanItem>): Promise<PlanItem> {
    const item = this.db.items.find((i) => i.id === id);
    if (!item) throw new Error(`item ${id} not found`);
    Object.assign(item, patch, { id: item.id });
    this.flush();
    return this.clone(item);
  }

  /* ---------- comments ---------- */
  async listComments(planId: string) {
    const itemIds = new Set(this.db.items.filter((i) => i.planId === planId).map((i) => i.id));
    return this.clone(this.db.comments.filter((c) => itemIds.has(c.planItemId)));
  }
  async addComment(input: AddCommentInput): Promise<Comment> {
    const comment: Comment = { id: newId(), createdAt: new Date().toISOString(), ...input };
    this.db.comments.push(comment);
    this.flush();
    return this.clone(comment);
  }

  /* ---------- annotations ---------- */
  async listAnnotations(planId: string) {
    const itemIds = new Set(this.db.items.filter((i) => i.planId === planId).map((i) => i.id));
    return this.clone(this.db.annotations.filter((a) => itemIds.has(a.planItemId)));
  }
  async addAnnotation(input: AddAnnotationInput): Promise<Annotation> {
    const annotation: Annotation = { id: newId(), createdAt: new Date().toISOString(), ...input };
    this.db.annotations.push(annotation);
    this.flush();
    return this.clone(annotation);
  }
  async deleteAnnotation(id: string): Promise<void> {
    this.db.annotations = this.db.annotations.filter((a) => a.id !== id);
    this.flush();
  }

  /* ---------- activity ---------- */
  async listActivity(planId: string) {
    return this.clone(
      this.db.activity
        .filter((a) => a.planId === planId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    );
  }
  async logActivity(input: LogActivityInput): Promise<ActivityEntry> {
    const entry: ActivityEntry = { id: newId(), createdAt: new Date().toISOString(), ...input };
    this.db.activity.push(entry);
    this.flush();
    return this.clone(entry);
  }
}
