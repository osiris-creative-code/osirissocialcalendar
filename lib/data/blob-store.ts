import { newId } from "@/lib/ids";
import { newToken } from "@/lib/tokens";
import type {
  ActivityEntry,
  Annotation,
  Brand,
  BrandSource,
  Comment,
  Plan,
  PlanAsset,
  PlanItem,
  PlanVersion,
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
  NewAsset,
  NewItem,
} from "./store";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Whole-database-as-one-blob store. Every write is read-modify-write of the full
 * `DbShape` under an optimistic version check: if another request wrote in
 * between, `saveBlob` returns `ok:false` and `mutate` re-reads and retries — so
 * concurrent writes serialize instead of clobbering each other.
 *
 * Reads go straight to `fetchBlob()` every time. There is no cross-request read
 * cache: a stale one made a write in one request invisible to the `router.refresh()`
 * that immediately followed it in another. Speed comes from co-locating the
 * function with the database (see `vercel.json` regions), not from caching.
 *
 * Subclasses implement `fetchBlob()` / `saveBlob()`.
 */
export abstract class BlobStore implements DataStore {
  /** Returns the blob plus an opaque version token for optimistic locking. */
  protected abstract fetchBlob(): Promise<{ db: DbShape; version: number }>;
  /** Writes only if the stored version still equals `version`. */
  protected abstract saveBlob(
    db: DbShape,
    version: number,
  ): Promise<{ ok: boolean; version: number }>;

  protected static normalize(db: Partial<DbShape> | null): DbShape {
    if (!db) return seedData();
    return {
      brands: (db.brands ?? []).map((b) => ({ ...b, feedScreenshotUrl: b.feedScreenshotUrl ?? null })),
      sources: db.sources ?? [],
      plans: (db.plans ?? []).map((p) => ({
        ...p,
        visionEnabled: p.visionEnabled ?? true,
        feedInsights: p.feedInsights ?? null,
        reviseDeadline: p.reviseDeadline ?? null,
        mediaPurgedAt: p.mediaPurgedAt ?? null,
      })),
      items: db.items ?? [],
      assets: db.assets ?? [],
      versions: db.versions ?? [],
      comments: db.comments ?? [],
      annotations: db.annotations ?? [],
      activity: db.activity ?? [],
    };
  }

  /** Fresh read on every call. */
  private async load(): Promise<DbShape> {
    const { db } = await this.fetchBlob();
    return db;
  }

  /** Read-modify-write with retry on version conflict. */
  private async mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    let lastResult: T;
    for (let attempt = 0; attempt < 8; attempt++) {
      const { db, version } = await this.fetchBlob();
      lastResult = fn(db);
      const res = await this.saveBlob(db, version);
      if (res.ok) return lastResult;
      await sleep(40 + attempt * 60);
    }
    throw new Error("yazma çakışması: çok fazla eşzamanlı değişiklik, tekrar deneyin");
  }

  /* ---------- brands ---------- */
  async listBrands(opts: { includeArchived?: boolean } = {}) {
    return (await this.load()).brands.filter((b) => opts.includeArchived || b.status === "active");
  }
  async getBrand(id: string) {
    return (await this.load()).brands.find((b) => b.id === id) ?? null;
  }
  async createBrand(input: CreateBrandInput): Promise<Brand> {
    const brand: Brand = {
      id: newId(),
      status: "active",
      createdAt: new Date().toISOString(),
      feedScreenshotUrl: null,
      ...input,
    };
    await this.mutate((db) => db.brands.push(brand));
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
    return (await this.load()).sources.filter((s) => s.brandId === brandId);
  }
  async createSource(input: CreateSourceInput): Promise<BrandSource> {
    const source: BrandSource = { id: newId(), ...input };
    await this.mutate((db) => db.sources.push(source));
    return source;
  }

  /* ---------- plans ---------- */
  async getPlan(id: string) {
    return (await this.load()).plans.find((p) => p.id === id) ?? null;
  }
  async getPlanByToken(kind: "internal" | "public", token: string) {
    const key = kind === "internal" ? "internalToken" : "publicToken";
    return (await this.load()).plans.find((p) => p[key] === token) ?? null;
  }
  async listPlans(opts: { brandId?: string; stages?: Stage[] } = {}) {
    return (await this.load()).plans.filter(
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
      reviseDeadline: null,
      mediaPurgedAt: null,
    };
    await this.mutate((db) => db.plans.push(plan));
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
  async deletePlan(id: string): Promise<void> {
    await this.mutate((db) => {
      const itemIds = new Set(db.items.filter((i) => i.planId === id).map((i) => i.id));
      db.plans = db.plans.filter((p) => p.id !== id);
      db.items = db.items.filter((i) => i.planId !== id);
      db.assets = db.assets.filter((a) => a.planId !== id);
      db.versions = db.versions.filter((v) => v.planId !== id);
      db.comments = db.comments.filter((c) => !itemIds.has(c.planItemId));
      db.annotations = db.annotations.filter((a) => !itemIds.has(a.planItemId));
      db.activity = db.activity.filter((a) => a.planId !== id);
    });
  }
  /** Strip a plan's uploaded files from the DB (the Storage delete happens in the route). */
  async purgePlanMedia(id: string): Promise<{ urls: string[] }> {
    return this.mutate((db) => {
      const itemIds = new Set(db.items.filter((i) => i.planId === id).map((i) => i.id));
      const urls = [
        ...db.assets.filter((a) => a.planId === id).map((a) => a.url),
        ...db.items.filter((i) => i.planId === id).flatMap((i) => i.media.map((m) => m.url)),
      ].filter((u): u is string => !!u);
      db.assets = db.assets.filter((a) => a.planId !== id);
      for (const item of db.items) {
        if (itemIds.has(item.id)) item.media = [];
      }
      const plan = db.plans.find((p) => p.id === id);
      if (plan) plan.mediaPurgedAt = new Date().toISOString();
      return { urls: [...new Set(urls)] };
    });
  }

  /* ---------- items ---------- */
  async listItems(planId: string) {
    return (await this.load()).items
      .filter((i) => i.planId === planId)
      .sort((a, b) => a.sort - b.sort);
  }
  async replaceItems(planId: string, items: NewItem[]): Promise<PlanItem[]> {
    const created: PlanItem[] = items.map((it) => ({ id: newId(), planId, ...it }));
    await this.mutate((db) => {
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

  /* ---------- assets ---------- */
  async listAssets(planId: string) {
    return (await this.load()).assets
      .filter((a) => a.planId === planId)
      .sort((a, b) => a.sort - b.sort);
  }
  async addAssets(planId: string, assets: NewAsset[]): Promise<PlanAsset[]> {
    let created: PlanAsset[] = [];
    await this.mutate((db) => {
      const base = db.assets.filter((a) => a.planId === planId).length;
      created = assets.map((a, i) => ({ id: newId(), planId, sort: base + i, ...a }));
      db.assets.push(...created);
    });
    return created;
  }
  async deleteAsset(id: string): Promise<void> {
    await this.mutate((db) => {
      db.assets = db.assets.filter((a) => a.id !== id);
    });
  }

  /* ---------- versions ---------- */
  async listVersions(planId: string) {
    return (await this.load()).versions
      .filter((v) => v.planId === planId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  async snapshotPlan(planId: string, label: string, actorName: string): Promise<PlanVersion> {
    let version: PlanVersion;
    return this.mutate((db) => {
      const items = db.items
        .filter((i) => i.planId === planId)
        .sort((a, b) => a.sort - b.sort);
      version = {
        id: newId(),
        planId,
        version: db.versions.filter((v) => v.planId === planId).length + 1,
        label,
        actorName,
        items: JSON.parse(JSON.stringify(items)) as PlanItem[],
        createdAt: new Date().toISOString(),
      };
      db.versions.push(version);
      const mine = db.versions
        .filter((v) => v.planId === planId)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      if (mine.length > 12) {
        const drop = new Set(mine.slice(0, mine.length - 12).map((v) => v.id));
        db.versions = db.versions.filter((v) => !drop.has(v.id));
      }
      return version;
    });
  }

  /* ---------- comments ---------- */
  async listComments(planId: string) {
    const db = await this.load();
    const itemIds = new Set(db.items.filter((i) => i.planId === planId).map((i) => i.id));
    return db.comments.filter((c) => itemIds.has(c.planItemId));
  }
  async addComment(input: AddCommentInput): Promise<Comment> {
    const comment: Comment = { id: newId(), createdAt: new Date().toISOString(), ...input };
    await this.mutate((db) => db.comments.push(comment));
    return comment;
  }

  /* ---------- annotations ---------- */
  async listAnnotations(planId: string) {
    const db = await this.load();
    const itemIds = new Set(db.items.filter((i) => i.planId === planId).map((i) => i.id));
    return db.annotations.filter((a) => itemIds.has(a.planItemId));
  }
  async addAnnotation(input: AddAnnotationInput): Promise<Annotation> {
    const annotation: Annotation = { id: newId(), createdAt: new Date().toISOString(), ...input };
    await this.mutate((db) => db.annotations.push(annotation));
    return annotation;
  }
  async deleteAnnotation(id: string): Promise<void> {
    await this.mutate((db) => {
      db.annotations = db.annotations.filter((a) => a.id !== id);
    });
  }

  /* ---------- activity ---------- */
  async listActivity(planId: string) {
    return (await this.load()).activity
      .filter((a) => a.planId === planId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  async logActivity(input: LogActivityInput): Promise<ActivityEntry> {
    const entry: ActivityEntry = { id: newId(), createdAt: new Date().toISOString(), ...input };
    await this.mutate((db) => db.activity.push(entry));
    return entry;
  }
}
