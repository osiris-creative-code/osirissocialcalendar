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

/**
 * Dev datastore backed by a JSON file. Read-modify-write on every operation so
 * separate module instances / requests always see the latest committed state.
 */
export class JsonStore implements DataStore {
  constructor(private path: string) {
    if (!existsSync(path)) this.write(seedData());
  }

  private read(): DbShape {
    if (!existsSync(this.path)) {
      const seeded = seedData();
      this.write(seeded);
      return seeded;
    }
    return JSON.parse(readFileSync(this.path, "utf8")) as DbShape;
  }

  private write(db: DbShape) {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(db, null, 2));
  }

  private mutate<T>(fn: (db: DbShape) => T): T {
    const db = this.read();
    const result = fn(db);
    this.write(db);
    return result;
  }

  /* ---------- brands ---------- */
  async listBrands(opts: { includeArchived?: boolean } = {}) {
    return this.read().brands.filter((b) => opts.includeArchived || b.status === "active");
  }
  async getBrand(id: string) {
    return this.read().brands.find((b) => b.id === id) ?? null;
  }
  async createBrand(input: CreateBrandInput): Promise<Brand> {
    const brand: Brand = { id: newId(), status: "active", createdAt: new Date().toISOString(), ...input };
    this.mutate((db) => db.brands.push(brand));
    return brand;
  }
  async updateBrand(id: string, patch: Partial<Brand>): Promise<Brand> {
    return this.mutate((db) => {
      const brand = db.brands.find((b) => b.id === id);
      if (!brand) throw new Error(`brand ${id} not found`);
      Object.assign(brand, patch, { id: brand.id });
      return { ...brand };
    });
  }

  /* ---------- sources ---------- */
  async listSources(brandId: string) {
    return this.read().sources.filter((s) => s.brandId === brandId);
  }
  async createSource(input: CreateSourceInput): Promise<BrandSource> {
    const source: BrandSource = { id: newId(), ...input };
    this.mutate((db) => db.sources.push(source));
    return source;
  }

  /* ---------- plans ---------- */
  async getPlan(id: string) {
    return this.read().plans.find((p) => p.id === id) ?? null;
  }
  async getPlanByToken(kind: "internal" | "public", token: string) {
    const key = kind === "internal" ? "internalToken" : "publicToken";
    return this.read().plans.find((p) => p[key] === token) ?? null;
  }
  async listPlans(opts: { brandId?: string; stages?: Stage[] } = {}) {
    return this.read().plans.filter(
      (p) =>
        (!opts.brandId || p.brandId === opts.brandId) &&
        (!opts.stages || opts.stages.includes(p.stage)),
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
      visionEnabled: input.visionEnabled ?? true,
      feedInsights: null,
    };
    this.mutate((db) => db.plans.push(plan));
    return plan;
  }
  async updatePlan(id: string, patch: Partial<Plan>): Promise<Plan> {
    return this.mutate((db) => {
      const plan = db.plans.find((p) => p.id === id);
      if (!plan) throw new Error(`plan ${id} not found`);
      Object.assign(plan, patch, { id: plan.id });
      return { ...plan };
    });
  }

  /* ---------- items ---------- */
  async listItems(planId: string) {
    return this.read()
      .items.filter((i) => i.planId === planId)
      .sort((a, b) => a.sort - b.sort);
  }
  async replaceItems(planId: string, items: NewItem[]): Promise<PlanItem[]> {
    const created: PlanItem[] = items.map((it) => ({ id: newId(), planId, ...it }));
    this.mutate((db) => {
      db.items = db.items.filter((i) => i.planId !== planId).concat(created);
    });
    return created;
  }
  async updateItem(id: string, patch: Partial<PlanItem>): Promise<PlanItem> {
    return this.mutate((db) => {
      const item = db.items.find((i) => i.id === id);
      if (!item) throw new Error(`item ${id} not found`);
      Object.assign(item, patch, { id: item.id });
      return { ...item };
    });
  }

  /* ---------- comments ---------- */
  async listComments(planId: string) {
    const db = this.read();
    const itemIds = new Set(db.items.filter((i) => i.planId === planId).map((i) => i.id));
    return db.comments.filter((c) => itemIds.has(c.planItemId));
  }
  async addComment(input: AddCommentInput): Promise<Comment> {
    const comment: Comment = { id: newId(), createdAt: new Date().toISOString(), ...input };
    this.mutate((db) => db.comments.push(comment));
    return comment;
  }

  /* ---------- annotations ---------- */
  async listAnnotations(planId: string) {
    const db = this.read();
    const itemIds = new Set(db.items.filter((i) => i.planId === planId).map((i) => i.id));
    return db.annotations.filter((a) => itemIds.has(a.planItemId));
  }
  async addAnnotation(input: AddAnnotationInput): Promise<Annotation> {
    const annotation: Annotation = { id: newId(), createdAt: new Date().toISOString(), ...input };
    this.mutate((db) => db.annotations.push(annotation));
    return annotation;
  }
  async deleteAnnotation(id: string): Promise<void> {
    this.mutate((db) => {
      db.annotations = db.annotations.filter((a) => a.id !== id);
    });
  }

  /* ---------- activity ---------- */
  async listActivity(planId: string) {
    return this.read()
      .activity.filter((a) => a.planId === planId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  async logActivity(input: LogActivityInput): Promise<ActivityEntry> {
    const entry: ActivityEntry = { id: newId(), createdAt: new Date().toISOString(), ...input };
    this.mutate((db) => db.activity.push(entry));
    return entry;
  }
}
