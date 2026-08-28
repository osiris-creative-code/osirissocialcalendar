# Ritim — Phase 1: Core App (Mock Adapters) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A locally-runnable Next.js app that walks the full workflow end to end — brand picker → create plan from a prompt → editor → in-house approval → brand calendar view (splash, grid/timeline, revisions) — using mock adapters for Drive, AI, storage, and auth, with a file-backed JSON datastore.

**Architecture:** Single Next.js App Router codebase. Three surfaces: `/app/*` (team, behind a shared team gate), `/i/[token]` (internal preview + approval), `/c/[token]` (brand view). Pure-logic modules (`lib/planner`, `lib/access`, `lib/tokens`) are framework-free and fully unit-tested. All external services sit behind interfaces in `lib/` with a `Mock*` implementation used in Phase 1; a file-backed `JsonStore` implements the `DataStore` interface so data survives restarts. Later phases swap in Supabase / Anthropic / Google Drive / R2 without touching UI or route code.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Vitest + @testing-library/react for unit/component tests, Playwright for E2E, `nanoid` for tokens, `zod` for schema validation.

## Global Constraints

- Language of all UI copy and domain terms: **Turkish**. Code identifiers in English.
- Aylık işletme maliyeti hedefi: **0** — Phase 1 has zero external service calls.
- Plan stages, exact values: `taslak`, `ic_onayda`, `markaya_hazir`, `markada`, `revize_istendi`, `onaylandi`.
- Roles, exact values: `developer`, `yonetici`, `onaylayan`, `marka`.
- Item types, exact values: `post`, `story`, `reel`, `special`.
- Comment stages, exact values: `internal`, `brand`.
- `public_token` is `null` until stage reaches `markaya_hazir`.
- Story items have `caption = null` and never show a caption field.
- Brand can only ever reach `/c/[token]`; that view has no navigation to any other brand or surface.
- Every state-changing action appends to `activity_log` with `actor_name` + `actor_role` + ISO timestamp.
- Splash screen: solid `brand.color_primary` background, centered logo, `<BRAND NAME>` + `<range_start> – <range_end> Sosyal Medya Paylaşım Takvimi`; 3.5s then fade out; ≤1s when `prefers-reduced-motion` or a repeat visit (sessionStorage key `ritim-splash-<token>`).
- Revizeleri gönder onay metni, birebir: `Revizeleriniz ekibe iletildi. En kısa sürede görülmesi için lütfen WhatsApp grubundan kısa bir not bırakın.`

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts, playwright.config.ts
tailwind + app/globals.css              — design tokens (ported from demo), light+dark
.data/db.json                           — file-backed datastore (gitignored)

lib/
  types.ts            — all domain TS types + zod schemas (Brand, Plan, PlanItem, Comment, Annotation, ActivityEntry, Role, Stage)
  tokens.ts           — newToken(prefix): unguessable id via nanoid
  ids.ts              — newId(): short unique id for rows
  planner/
    cadence.ts        — parseCadence(prompt): CadenceRule[]  (dates, ranges, "2 günde bir", "her gün", "hafta içi", "haftada 1", "güne özel")
    distribute.ts     — buildSlots(rules, range): Slot[] ; assignAssets(slots, assets): { extend: DraftItem[], stopAtAssets: DraftItem[], gap: boolean }
    index.ts          — planFromPrompt(prompt, range, assets): PlannerResult
  ai/
    types.ts          — CaptionRequest, CaptionResult, AIClient interface
    mock.ts           — MockAI: deterministic Turkish captions per item type/brand tone
  sources/
    types.ts          — Asset, SourceConfig, Source interface (list(): Asset[])
    mock-drive.ts     — MockDriveSource: fake POST/STORY/reel assets, filename-derived slide order
    slide-order.ts    — slideOrderFromName(name): number|null  ("... 1" / "... 2" / "kaydırmalı 2")
  storage/
    types.ts          — MediaStore interface (put(file|url): {url})
    local.ts          — LocalMediaStore: copies uploads to /public/uploads, passes through external urls
  access/
    roles.ts          — resolveRole(cookies): { name, role } | null ; ROLE_LABELS
    gate.ts           — checkTeamToken(value), checkDeveloperPassword(value)  (env with dev defaults)
  data/
    store.ts          — DataStore interface (brands/plans/items/comments/annotations/activity CRUD)
    json-store.ts     — JsonStore: reads/writes .data/db.json, seeded on first run
    seed.ts           — seedData(): 2 demo brands (Elit Bakery, Pablo) + sources
  db.ts               — singleton getStore(): DataStore

app/
  globals.css
  layout.tsx
  page.tsx                                   — redirects to /app
  (team)/
    layout.tsx                               — team gate + top bar (active brand, role, tabs)
    app/page.tsx                             — redirect -> /app/brands
    app/brands/page.tsx                      — brand cards (hover-lift) + "＋ Marka ekle"
    app/brands/[brandId]/page.tsx            — plans list + brand settings panel
    app/brands/[brandId]/plans/new/page.tsx  — create plan (source pick + prompt)
    app/plans/[planId]/page.tsx              — editor (drag/reorder, captions, gap fill, theme, stage actions)
    app/queue/page.tsx                       — approval queue grouped by stage
    app/developer/page.tsx                   — dev tab (password) : all plans, archive brands, config, activity log
  i/[token]/page.tsx                         — internal preview (calendar + "İÇ ONAY" banner + Onayla/Geri gönder)
  c/[token]/page.tsx                         — brand view (splash + calendar + Revizeleri gönder)
  api/
    gate/route.ts            — POST team token / developer password -> sets cookie
    role/route.ts            — POST { name, role } -> sets cookie
    brands/route.ts          — GET list, POST create
    brands/[id]/route.ts     — PATCH (settings, archive)
    plans/route.ts           — POST create (brandId, title, range, prompt, sourceId)
    plans/[id]/route.ts      — GET, PATCH (items, theme, title)
    plans/[id]/generate/route.ts  — POST -> runs planner + MockAI, returns { extend, stopAtAssets, gap }
    plans/[id]/stage/route.ts     — POST { to, actorName, actorRole } -> validates transition, mints tokens
    plans/[id]/comments/route.ts  — GET, POST { itemId, stage, authorName, authorRole, body, status }
    plans/[id]/annotations/route.ts — GET, POST, DELETE
    plans/[id]/submit/route.ts    — POST { round: 'revize'|'onay', authorName } -> sets stage revize_istendi|onaylandi

components/
  calendar/
    CalendarView.tsx     — wraps Grid + Timeline + view toggle ; props: plan, items, mode ('brand'|'internal'), onComment, onAnnotate, onStatus
    GridView.tsx         — 3-col IG-style grid of post/reel + separate story strip
    TimelineView.tsx     — date-rail cards
    ItemCard.tsx         — media + type chip + caption + status buttons + comment box
    Carousel.tsx         — slides + dots + prev/next
    ReelPlayer.tsx       — poster + play -> mock "playing" state
    PinLayer.tsx         — click media -> numbered pin + note popover
  Splash.tsx             — brand-color splash with logo + title, fade-out, reduced-motion + repeat-visit aware
  team/
    TopBar.tsx           — wordmark + active brand + role + tab links + theme toggle
    BrandCard.tsx        — logo card with hover-lift
    StageBadge.tsx       — colored badge per stage
    PlanEditor.tsx       — reorderable rows, editable captions, gap fill, theme pickers, stage action bar
    FeedbackInbox.tsx    — comments + annotations list, grouped by item, stage + author shown
  ui/                    — Button, Field, Modal, Toast, Tabs primitives

tests/  (mirrors lib/ and components/)
e2e/full-flow.spec.ts
```

---

## Task 1: Project scaffold + design tokens + test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `.gitignore` (append), `tests/smoke.test.ts`
- Create: `components/ui/Button.tsx`, `components/ui/Modal.tsx`, `components/ui/Toast.tsx`

**Interfaces:**
- Produces: a running `npm run dev`, `npm test` (Vitest), Tailwind v4 configured, CSS custom properties for the palette (`--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-dim`, `--text-mute`, `--brand`, `--accent`, `--gold`, `--ok`, `--warn`) defined for light on `:root`, redefined under `@media (prefers-color-scheme: dark)` guarded `:root:not([data-theme="light"])` and under `:root[data-theme="dark"]`.
- Produces: `Button({variant?: 'primary'|'ghost'|'quiet', ...})`, `Modal({open, onClose, children})`, `Toast.show(message, {action?})`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/smoke.test.ts
import { describe, it, expect } from "vitest";
import { PALETTE_KEYS } from "../lib/theme";

describe("scaffold", () => {
  it("exposes the documented palette keys", () => {
    expect(PALETTE_KEYS).toContain("--brand");
    expect(PALETTE_KEYS).toContain("--accent");
    expect(PALETTE_KEYS.length).toBeGreaterThanOrEqual(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/smoke.test.ts`
Expected: FAIL — cannot resolve `../lib/theme`.

- [ ] **Step 3: Create scaffold**

Initialize with `npx create-next-app@latest . --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*"` (accept into current dir), then:
- Add `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `nanoid`, `zod` as devDeps/deps.
- `vitest.config.ts`: react plugin, `environment: "jsdom"`, `globals: true`, `setupFiles: ["tests/setup.ts"]`.
- `tests/setup.ts`: `import "@testing-library/jest-dom/vitest";`
- Replace `app/globals.css` palette section with the tokens from `scratchpad/ritim-demo.html` (the `:root` / dark blocks), keep Tailwind's `@import "tailwindcss";` at top.
- `lib/theme.ts`:

```ts
export const PALETTE_KEYS = [
  "--bg","--surface","--surface-2","--border","--border-strong",
  "--text","--text-dim","--text-mute","--brand","--accent","--gold","--ok","--warn",
] as const;
```

- `app/page.tsx`: `import { redirect } from "next/navigation"; export default function Home(){ redirect("/app"); }`
- `components/ui/Button.tsx`, `Modal.tsx`, `Toast.tsx`: minimal implementations using the tokens (Button variants map to bg/border classes; Modal is a fixed scrim + centered card; Toast is a module singleton rendering into a portal div `#toast-root` added in `app/layout.tsx`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/smoke.test.ts` → PASS
Run: `npm run dev` → app boots, `/` redirects to `/app` (404 for now is fine).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: next.js scaffold, design tokens, ui primitives, vitest harness"
```

---

## Task 2: Domain types + zod schemas

**Files:**
- Create: `lib/types.ts`, `lib/ids.ts`, `lib/tokens.ts`, `tests/types.test.ts`

**Interfaces:**
- Produces:
  - `Role = "developer" | "yonetici" | "onaylayan" | "marka"`
  - `Stage = "taslak" | "ic_onayda" | "markaya_hazir" | "markada" | "revize_istendi" | "onaylandi"`
  - `ItemType = "post" | "story" | "reel" | "special"`
  - `CommentStage = "internal" | "brand"`
  - `Media = { url: string; kind: "image" | "video"; slideOrder: number }`
  - `Brand = { id; name; logoUrl; colorPrimary; colorAccent; instagramHandle: string|null; status: "active"|"archived"; createdByName; createdAt }`
  - `BrandSource = { id; brandId; kind: "drive_oauth"|"public_link"|"manual"; label; config: Record<string,unknown> }`
  - `Plan = { id; brandId; title; rangeStart: string; rangeEnd: string; prompt: string; stage: Stage; theme: {primary:string; accent:string}; internalToken: string; publicToken: string|null; version: number; lastActorName: string|null; createdAt }`
  - `PlanItem = { id; planId; date: string; type: ItemType; sort: number; caption: string|null; specialLabel: string|null; media: Media[]; isGap: boolean; hidden: boolean }`
  - `Comment = { id; planItemId; stage: CommentStage; authorName; authorRole: Role; body; status: "none"|"approved"|"changes"; createdAt }`
  - `Annotation = { id; planItemId; mediaIndex: number; xPct: number; yPct: number; note: string; stage: CommentStage; authorName; createdAt }`
  - `ActivityEntry = { id; planId; actorName; actorRole: Role; action: string; meta: Record<string,unknown>; createdAt }`
  - zod schemas `zBrand`, `zPlan`, `zPlanItem`, `zComment`, `zAnnotation` mirroring the above (used by API routes).
  - `newId(): string` (12-char), `newToken(prefix: "i"|"c"): string` (`${prefix}_` + 21-char nanoid).

- [ ] **Step 1: Write the failing test**

```ts
// tests/types.test.ts
import { describe, it, expect } from "vitest";
import { newId, newToken } from "../lib/ids";
import { zPlan } from "../lib/types";

describe("ids + tokens", () => {
  it("newId is unique-ish and short", () => {
    const a = newId(), b = newId();
    expect(a).not.toBe(b);
    expect(a.length).toBe(12);
  });
  it("newToken carries its prefix", () => {
    expect(newToken("c").startsWith("c_")).toBe(true);
  });
});

describe("zPlan", () => {
  it("rejects an unknown stage", () => {
    const bad = { id: "x", brandId: "b", title: "t", rangeStart: "2026-08-28", rangeEnd: "2026-09-11",
      prompt: "", stage: "nope", theme: { primary: "#000", accent: "#111" },
      internalToken: "i_x", publicToken: null, version: 1, lastActorName: null, createdAt: "2026-08-28T00:00:00Z" };
    expect(zPlan.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/types.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement `lib/ids.ts`, `lib/tokens.ts`, `lib/types.ts`** per the Interfaces block. `newId` = `nanoid(12)`. `newToken` re-exported from `lib/tokens.ts` and `lib/ids.ts`.

- [ ] **Step 4: Run to verify it passes** — `npx vitest run tests/types.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: domain types + zod schemas + id/token helpers"`

---

## Task 3: Cadence parser

**Files:**
- Create: `lib/planner/cadence.ts`, `tests/planner/cadence.test.ts`

**Interfaces:**
- Produces:
  - `type CadenceRule = { type: ItemType; every: number; unit: "day"; weekdaysOnly: boolean } | { type: ItemType; onDates: string[] }`
  - `parseCadence(prompt: string): CadenceRule[]`
- Recognizes (Turkish, case-insensitive):
  - `"her gün story"` → `{ type:"story", every:1, unit:"day", weekdaysOnly:false }`
  - `"2 günde bir post"` / `"iki günde bir post"` → `{ type:"post", every:2, ... }`
  - `"haftada 1 reels"` / `"haftada bir reels"` → `{ type:"reel", every:7, ... }`
  - `"hafta içi post"` → sets `weekdaysOnly:true`
  - `"7 Eylül ... güne özel"` or `"<gün> <ay>'e özel"` → `{ type:"special", onDates:["2026-09-07"] }` (year from the plan range, passed via 2nd arg)
  - Bare `"28 Ağustos"`, `"11 Eylül"` date mentions attached to a type → `onDates`
- Signature actually: `parseCadence(prompt: string, rangeYear: number): CadenceRule[]`
- Unknown / unparseable clauses are ignored (never throw).

- [ ] **Step 1: Write the failing test**

```ts
// tests/planner/cadence.test.ts
import { describe, it, expect } from "vitest";
import { parseCadence } from "../../lib/planner/cadence";

const P = "01–12 Eylül arası: 2 günde bir post, her gün story, haftada 1 reels. 7 Eylül Dünya Çikolata Günü'ne özel post.";

describe("parseCadence", () => {
  const rules = parseCadence(P, 2026);

  it("finds the post cadence", () => {
    expect(rules).toContainEqual({ type: "post", every: 2, unit: "day", weekdaysOnly: false });
  });
  it("finds daily story", () => {
    expect(rules).toContainEqual({ type: "story", every: 1, unit: "day", weekdaysOnly: false });
  });
  it("finds weekly reel", () => {
    expect(rules).toContainEqual({ type: "reel", every: 7, unit: "day", weekdaysOnly: false });
  });
  it("finds the special day", () => {
    expect(rules).toContainEqual({ type: "special", onDates: ["2026-09-07"] });
  });
  it("ignores gibberish without throwing", () => {
    expect(parseCadence("lorem ipsum dolor", 2026)).toEqual([]);
  });
  it("handles 'hafta içi'", () => {
    const r = parseCadence("hafta içi 2 günde bir post", 2026);
    expect(r[0]).toMatchObject({ type: "post", weekdaysOnly: true });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL (module missing).

- [ ] **Step 3: Implement `parseCadence`.** Approach: split prompt on `[,.;\n]`, for each clause: detect item type keyword (`post`, `story`|`hikaye`, `reel`|`reels`, `güne özel`→special); detect `her gün` (every 1), `N günde bir` with a Turkish-number map (`bir..on`), `haftada (1|bir)` (every 7); `hafta içi` → weekdaysOnly; Turkish month map (`ocak..aralık`) + day number → `YYYY-MM-DD` using `rangeYear`. Collect date matches into `onDates` rules; cadence matches into cadence rules. Dedupe.

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: Turkish cadence rule parser"`

---

## Task 4: Slot builder + asset distribution

**Files:**
- Create: `lib/planner/distribute.ts`, `lib/planner/index.ts`, `tests/planner/distribute.test.ts`

**Interfaces:**
- Consumes: `CadenceRule` (Task 3), `Asset` (Task 6 — define a local minimal `PlannerAsset = { id: string; type: ItemType; slideGroup?: string; slideOrder: number }` here to avoid a cycle; `lib/sources` will structurally satisfy it).
- Produces:
  - `type Slot = { date: string; type: ItemType; specialLabel?: string }`
  - `buildSlots(rules: CadenceRule[], rangeStart: string, rangeEnd: string): Slot[]` — expands cadence across the inclusive date range, sorted by date then type; `special` slots always included; a date can hold multiple slots of different types; no duplicate (date,type).
  - `type DraftItem = { date: string; type: ItemType; assetIds: string[]; isGap: boolean; specialLabel: string|null }`
  - `assignAssets(slots: Slot[], assets: PlannerAsset[]): { extend: DraftItem[]; stopAtAssets: DraftItem[]; gap: boolean }`
    - assets consumed in order, grouped by `type`; carousel `post`/`special` slots pull all assets sharing a `slideGroup` (ordered by `slideOrder`), else one asset per slot; `story`/`reel` one each.
    - `extend`: every slot filled; slots with no asset left → `isGap:true, assetIds:[]`.
    - `stopAtAssets`: slots truncated at the point assets run out (trailing gap slots dropped).
    - `gap`: true when `extend` contains any `isGap`.
  - `planFromPrompt(prompt: string, rangeStart: string, rangeEnd: string, assets: PlannerAsset[]): { rules: CadenceRule[]; extend: DraftItem[]; stopAtAssets: DraftItem[]; gap: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/planner/distribute.test.ts
import { describe, it, expect } from "vitest";
import { buildSlots, assignAssets } from "../../lib/planner/distribute";

describe("buildSlots", () => {
  it("expands '2 günde bir post' across a range", () => {
    const slots = buildSlots(
      [{ type: "post", every: 2, unit: "day", weekdaysOnly: false }],
      "2026-09-01", "2026-09-07",
    );
    expect(slots.map(s => s.date)).toEqual(["2026-09-01","2026-09-03","2026-09-05","2026-09-07"]);
  });
  it("includes special-day slots", () => {
    const slots = buildSlots([{ type: "special", onDates: ["2026-09-07"] }], "2026-09-01", "2026-09-10");
    expect(slots).toEqual([{ date: "2026-09-07", type: "special", specialLabel: undefined }]);
  });
});

describe("assignAssets", () => {
  const slots = [
    { date: "2026-09-01", type: "post" as const },
    { date: "2026-09-03", type: "post" as const },
    { date: "2026-09-05", type: "post" as const },
  ];
  it("leaves flagged gaps in extend, truncates stopAtAssets", () => {
    const assets = [
      { id: "a1", type: "post" as const, slideOrder: 0 },
      { id: "a2", type: "post" as const, slideOrder: 0 },
    ];
    const { extend, stopAtAssets, gap } = assignAssets(slots, assets);
    expect(extend.map(i => i.isGap)).toEqual([false, false, true]);
    expect(stopAtAssets).toHaveLength(2);
    expect(gap).toBe(true);
  });
  it("groups carousel assets by slideGroup", () => {
    const assets = [
      { id: "a1", type: "post" as const, slideGroup: "g1", slideOrder: 1 },
      { id: "a2", type: "post" as const, slideGroup: "g1", slideOrder: 2 },
    ];
    const { extend } = assignAssets([slots[0]], assets);
    expect(extend[0].assetIds).toEqual(["a1", "a2"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `distribute.ts` + `index.ts`.** Use plain `Date` UTC math for the range walk (`new Date(Date.parse(start))`, add `every*86400000`). `weekdaysOnly` skips Sat/Sun. `index.ts` wires `parseCadence` → `buildSlots` → `assignAssets`, threading `rangeYear = Number(rangeStart.slice(0,4))`.

- [ ] **Step 4: Run to verify it passes** — PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: cadence slot builder + asset distribution with gap handling"`

---

## Task 5: Access — roles + gate

**Files:**
- Create: `lib/access/roles.ts`, `lib/access/gate.ts`, `tests/access/roles.test.ts`

**Interfaces:**
- Produces:
  - `ROLE_LABELS: Record<Role, string>` = `{ developer:"Developer", yonetici:"Yönetici", onaylayan:"In-house onaylayan", marka:"Marka" }`
  - `resolveActor(cookieValue: string | undefined): { name: string; role: Role } | null` — parses `name|role` cookie, validates role.
  - `serializeActor(name: string, role: Role): string`
  - `checkTeamToken(input: string): boolean` — compares against `process.env.RITIM_TEAM_TOKEN ?? "ritim-dev"`.
  - `checkDeveloperPassword(input: string): boolean` — compares against `process.env.RITIM_DEV_PASSWORD ?? "dev"`.
  - `canEditPlans(role: Role): boolean` — true for `yonetici`, `onaylayan`, `developer`.
  - `canAddBrand(role: Role): boolean` — true for `yonetici`, `developer`.
  - `canArchiveBrand(role: Role): boolean` — true for `developer` only.

- [ ] **Step 1: Write the failing test**

```ts
// tests/access/roles.test.ts
import { describe, it, expect } from "vitest";
import { resolveActor, serializeActor, canAddBrand, canArchiveBrand, checkTeamToken } from "../../lib/access/roles";
import { } from "../../lib/access/gate";

describe("actor cookie", () => {
  it("round-trips", () => {
    const s = serializeActor("Derya", "yonetici");
    expect(resolveActor(s)).toEqual({ name: "Derya", role: "yonetici" });
  });
  it("rejects an unknown role", () => {
    expect(resolveActor("Derya|godmode")).toBeNull();
  });
  it("returns null for undefined", () => {
    expect(resolveActor(undefined)).toBeNull();
  });
});

describe("permissions", () => {
  it("yönetici adds but does not archive brands", () => {
    expect(canAddBrand("yonetici")).toBe(true);
    expect(canArchiveBrand("yonetici")).toBe(false);
  });
  it("developer archives", () => {
    expect(canArchiveBrand("developer")).toBe(true);
  });
});

describe("team token", () => {
  it("accepts the dev default", () => {
    expect(checkTeamToken("ritim-dev")).toBe(true);
    expect(checkTeamToken("nope")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement `roles.ts` + `gate.ts`.** Cookie format `name|role`; `name` may contain no `|` (reject if it does). `gate.ts` re-exports `checkTeamToken`/`checkDeveloperPassword` (kept separate file so route code imports intent-clearly).
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: role resolution, permissions, team + developer gate"`

---

## Task 6: Sources — mock Drive + slide order

**Files:**
- Create: `lib/sources/types.ts`, `lib/sources/slide-order.ts`, `lib/sources/mock-drive.ts`, `tests/sources/slide-order.test.ts`, `tests/sources/mock-drive.test.ts`

**Interfaces:**
- Produces:
  - `type Asset = { id: string; name: string; type: ItemType; kind: "image"|"video"; url: string; slideGroup?: string; slideOrder: number }`
  - `slideOrderFromName(name: string): number | null` — `"post-kaydirmali 2.jpg"` → 2; `"story_03.png"` → 3; `"reel.mp4"` → null; trailing integer before extension, or after `kaydırmalı`/`kaydirmali`.
  - `interface Source { list(): Promise<Asset[]> }`
  - `class MockDriveSource implements Source` — ctor `(config: { postCount?: number; storyCount?: number; reelCount?: number })`; returns deterministic assets: post assets get `slideGroup` in pairs (`g1` covers first two, etc.) to exercise carousels; `url` points to `/demo/ph-<n>.svg` placeholders committed under `public/demo/`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/sources/slide-order.test.ts
import { describe, it, expect } from "vitest";
import { slideOrderFromName } from "../../lib/sources/slide-order";

describe("slideOrderFromName", () => {
  it.each([
    ["post-kaydirmali 2.jpg", 2],
    ["ELIT kaydırmalı 1.png", 1],
    ["story_03.png", 3],
    ["hero.jpg", null],
    ["reel.mp4", null],
  ])("%s -> %s", (name, expected) => {
    expect(slideOrderFromName(name)).toBe(expected);
  });
});
```

```ts
// tests/sources/mock-drive.test.ts
import { describe, it, expect } from "vitest";
import { MockDriveSource } from "../../lib/sources/mock-drive";

describe("MockDriveSource", () => {
  it("returns the requested counts and pairs carousel assets", async () => {
    const assets = await new MockDriveSource({ postCount: 4, storyCount: 2, reelCount: 1 }).list();
    expect(assets.filter(a => a.type === "post")).toHaveLength(4);
    expect(assets.filter(a => a.type === "story")).toHaveLength(2);
    expect(assets.filter(a => a.type === "reel")).toHaveLength(1);
    const g = assets.find(a => a.type === "post")!.slideGroup;
    expect(assets.filter(a => a.slideGroup === g).length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement.** Also add 5 tiny SVG placeholders `public/demo/ph-1.svg`..`ph-5.svg` (colored gradients, from the demo's `.ph` palette).
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: mock Drive source + filename slide-order parsing + demo placeholders"`

---

## Task 7: Mock AI captions

**Files:**
- Create: `lib/ai/types.ts`, `lib/ai/mock.ts`, `tests/ai/mock.test.ts`

**Interfaces:**
- Consumes: `ItemType`, `DraftItem` (Task 4).
- Produces:
  - `type CaptionRequest = { brandName: string; tone: string; items: { date: string; type: ItemType; specialLabel: string|null }[] }`
  - `type CaptionResult = { captions: (string | null)[] }` — same length/order as `items`; `null` for `story`.
  - `interface AIClient { captions(req: CaptionRequest): Promise<CaptionResult> }`
  - `class MockAI implements AIClient` — deterministic: post → `"<brandName> · <insan-dostu tarih> — <şablon cümle> #<slug>"`; reel → `"<şablon> 🎥 #reels"`; special → uses `specialLabel`; story → `null`. Templates drawn from a fixed Turkish array indexed by day-of-month for determinism.

- [ ] **Step 1: Write the failing test**

```ts
// tests/ai/mock.test.ts
import { describe, it, expect } from "vitest";
import { MockAI } from "../../lib/ai/mock";

describe("MockAI", () => {
  it("returns one caption slot per item, null for story, deterministic", async () => {
    const ai = new MockAI();
    const req = { brandName: "Pablo", tone: "sıcak", items: [
      { date: "2026-09-01", type: "post" as const, specialLabel: null },
      { date: "2026-09-02", type: "story" as const, specialLabel: null },
      { date: "2026-09-07", type: "special" as const, specialLabel: "Dünya Çikolata Günü" },
    ]};
    const a = await ai.captions(req);
    const b = await ai.captions(req);
    expect(a.captions).toHaveLength(3);
    expect(a.captions[1]).toBeNull();
    expect(a.captions[2]).toContain("Dünya Çikolata Günü");
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement `MockAI`.**
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: MockAI deterministic Turkish caption generator"`

---

## Task 8: DataStore interface + JSON store + seed

**Files:**
- Create: `lib/data/store.ts`, `lib/data/json-store.ts`, `lib/data/seed.ts`, `lib/db.ts`, `tests/data/json-store.test.ts`
- Modify: `.gitignore` (add `.data/`)

**Interfaces:**
- Consumes: all `lib/types.ts` types.
- Produces:
  - `interface DataStore` with async methods:
    - `listBrands(opts?: { includeArchived?: boolean }): Promise<Brand[]>`
    - `getBrand(id): Promise<Brand | null>` ; `createBrand(input: Omit<Brand,"id"|"createdAt"|"status">): Promise<Brand>` ; `updateBrand(id, patch: Partial<Brand>): Promise<Brand>`
    - `listSources(brandId): Promise<BrandSource[]>` ; `createSource(input): Promise<BrandSource>`
    - `getPlan(id): Promise<Plan | null>` ; `getPlanByToken(kind: "internal"|"public", token): Promise<Plan | null>`
    - `listPlans(opts?: { brandId?: string; stages?: Stage[] }): Promise<Plan[]>`
    - `createPlan(input): Promise<Plan>` ; `updatePlan(id, patch: Partial<Plan>): Promise<Plan>`
    - `listItems(planId): Promise<PlanItem[]>` ; `replaceItems(planId, items: Omit<PlanItem,"id"|"planId">[]): Promise<PlanItem[]>` ; `updateItem(id, patch): Promise<PlanItem>`
    - `listComments(planId): Promise<Comment[]>` ; `addComment(input): Promise<Comment>`
    - `listAnnotations(planId): Promise<Annotation[]>` ; `addAnnotation(input): Promise<Annotation>` ; `deleteAnnotation(id): Promise<void>`
    - `listActivity(planId): Promise<ActivityEntry[]>` ; `logActivity(input): Promise<ActivityEntry>`
  - `class JsonStore implements DataStore` — persists the whole DB object to `.data/db.json` on every write (debounced 50ms ok, but sync-simple is fine); loads on construct; if file missing, writes `seedData()`.
  - `seedData(): DbShape` — brands **Elit Bakery** (`#7A4A2B`/`#D9982F`, handle `elitbakery`) and **Pablo** (`#2E2A26`/`#C6963C`, handle `pablo`), each with a `manual` + a `drive_oauth`(mock) source; no plans.
  - `getStore(): DataStore` singleton in `lib/db.ts` (module-level).

- [ ] **Step 1: Write the failing test**

```ts
// tests/data/json-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonStore } from "../../lib/data/json-store";

let store: JsonStore;
beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "ritim-"));
  store = new JsonStore(join(dir, "db.json"));
});

describe("JsonStore", () => {
  it("seeds two active brands", async () => {
    const brands = await store.listBrands();
    expect(brands.map(b => b.name).sort()).toEqual(["Elit Bakery", "Pablo"]);
  });
  it("creates a plan and reads it back by internal token", async () => {
    const [brand] = await store.listBrands();
    const plan = await store.createPlan({
      brandId: brand.id, title: "Eylül", rangeStart: "2026-08-28", rangeEnd: "2026-09-11",
      prompt: "her gün story", theme: { primary: brand.colorPrimary, accent: brand.colorAccent },
    });
    expect(plan.stage).toBe("taslak");
    expect(plan.publicToken).toBeNull();
    const back = await store.getPlanByToken("internal", plan.internalToken);
    expect(back?.id).toBe(plan.id);
  });
  it("persists across instances", async () => {
    const [brand] = await store.listBrands();
    await store.createPlan({ brandId: brand.id, title: "P", rangeStart: "2026-09-01", rangeEnd: "2026-09-02",
      prompt: "", theme: { primary: "#000", accent: "#111" } });
    const reopened = new JsonStore((store as any).path);
    expect(await reopened.listPlans()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement `store.ts` (types only), `json-store.ts`, `seed.ts`, `db.ts`.** `createPlan` sets `stage:"taslak"`, `version:1`, `internalToken:newToken("i")`, `publicToken:null`, `createdAt` now.
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: DataStore interface + file-backed JsonStore + seed data"`

---

## Task 9: Stage machine

**Files:**
- Create: `lib/plan-stages.ts`, `tests/plan-stages.test.ts`

**Interfaces:**
- Consumes: `Stage` (Task 2).
- Produces:
  - `STAGE_LABELS: Record<Stage,string>` (Turkish) and `STAGE_ORDER: Stage[]`.
  - `canTransition(from: Stage, to: Stage): boolean` per the spec's lifecycle:
    - `taslak → ic_onayda`
    - `ic_onayda → markaya_hazir` | `ic_onayda → taslak`
    - `markaya_hazir → markada`
    - `markada → revize_istendi` | `markada → onaylandi`
    - `revize_istendi → markada`
  - `mintsPublicToken(to: Stage): boolean` — true only for `markada` when coming from `markaya_hazir` (caller passes `from`); expose as `mintsPublicToken(from: Stage, to: Stage)`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/plan-stages.test.ts
import { describe, it, expect } from "vitest";
import { canTransition, mintsPublicToken } from "../lib/plan-stages";

describe("canTransition", () => {
  it("allows the happy path", () => {
    expect(canTransition("taslak", "ic_onayda")).toBe(true);
    expect(canTransition("ic_onayda", "markaya_hazir")).toBe(true);
    expect(canTransition("markaya_hazir", "markada")).toBe(true);
    expect(canTransition("markada", "revize_istendi")).toBe(true);
    expect(canTransition("revize_istendi", "markada")).toBe(true);
  });
  it("allows send-back", () => {
    expect(canTransition("ic_onayda", "taslak")).toBe(true);
  });
  it("rejects skips", () => {
    expect(canTransition("taslak", "markada")).toBe(false);
    expect(canTransition("onaylandi", "taslak")).toBe(false);
  });
});

describe("mintsPublicToken", () => {
  it("only when markaya_hazir -> markada", () => {
    expect(mintsPublicToken("markaya_hazir", "markada")).toBe(true);
    expect(mintsPublicToken("revize_istendi", "markada")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement `plan-stages.ts`** as a transition adjacency map.
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: plan stage transition machine"`

---

## Task 10: API — gate, role, brands

**Files:**
- Create: `app/api/gate/route.ts`, `app/api/role/route.ts`, `app/api/brands/route.ts`, `app/api/brands/[id]/route.ts`, `tests/api/brands.test.ts`
- Create: `lib/api/session.ts` (`requireActor(req)`, `requireTeam(req)`, `requireDeveloper(req)` helpers reading cookies)

**Interfaces:**
- Consumes: `getStore` (Task 8), `resolveActor`/`checkTeamToken`/`checkDeveloperPassword`/`canAddBrand`/`canArchiveBrand` (Task 5).
- Produces (HTTP):
  - `POST /api/gate` `{ kind:"team"|"developer", value }` → 204 + sets `ritim_team=1` / `ritim_dev=1` httpOnly cookie, or 401.
  - `POST /api/role` `{ name, role }` → 204 + sets `ritim_actor=name|role` cookie (rejects `role:"marka"` and `developer` unless `ritim_dev` cookie present) or 403.
  - `GET /api/brands` → `Brand[]` (active only unless `?all=1` and dev cookie).
  - `POST /api/brands` `{ name, colorPrimary, colorAccent, instagramHandle? }` → `Brand` (403 unless `canAddBrand`).
  - `PATCH /api/brands/[id]` `{ ...patch }` — archive requires `canArchiveBrand`.
- `lib/api/session.ts`: `requireActor(req): {name,role} | Response(401)`, etc. (returns a union; route does `if (actor instanceof Response) return actor;`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/brands.test.ts
import { describe, it, expect } from "vitest";
import { GET, POST } from "../../app/api/brands/route";

function req(method: string, body?: unknown, cookies = "") {
  return new Request("http://t/api/brands", {
    method, headers: { "content-type": "application/json", cookie: cookies },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/brands", () => {
  it("GET returns seeded brands", async () => {
    const res = await GET(req("GET"));
    const brands = await res.json();
    expect(brands.length).toBeGreaterThanOrEqual(2);
  });
  it("POST without an editor actor is 403", async () => {
    const res = await POST(req("POST", { name: "X", colorPrimary: "#000", colorAccent: "#111" }));
    expect(res.status).toBe(403);
  });
  it("POST as yönetici creates a brand", async () => {
    const res = await POST(req("POST",
      { name: "Deniz Cafe", colorPrimary: "#4C7A3F", colorAccent: "#B7C24A" },
      "ritim_team=1; ritim_actor=Derya|yonetici"));
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Deniz Cafe");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement the routes + `session.ts`.** Use `next/headers` `cookies()` in route handlers; for testability accept the `Request` and parse `cookie` header directly in `session.ts` (don't rely on `next/headers` in unit tests).
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: gate/role/brands API + session helpers"`

---

## Task 11: API — plans, generate, items

**Files:**
- Create: `app/api/plans/route.ts`, `app/api/plans/[id]/route.ts`, `app/api/plans/[id]/generate/route.ts`, `tests/api/plans.test.ts`

**Interfaces:**
- Consumes: `getStore`, `planFromPrompt` (Task 4), `MockAI` (Task 7), `MockDriveSource` (Task 6), `requireActor` (Task 10).
- Produces:
  - `POST /api/plans` `{ brandId, title, rangeStart, rangeEnd, prompt, sourceKind?: "mock" }` → `Plan` (stage `taslak`).
  - `GET /api/plans/[id]` → `{ plan: Plan; items: PlanItem[] }`.
  - `PATCH /api/plans/[id]` `{ title?, theme?, items? }` — `items` is the full ordered array of `Omit<PlanItem,"id"|"planId">`; replaces via `replaceItems`; bumps `version`.
  - `POST /api/plans/[id]/generate` `{ mode?: "extend"|"stopAtAssets" }` → runs `MockDriveSource` (counts from a fixed demo config) → `planFromPrompt` → `MockAI.captions` for the chosen mode → `replaceItems` → `{ items: PlanItem[]; gap: boolean; ruleCount: number }`. Default `mode` omitted → returns `{ gap, ruleCount, preview: { extendCount, stopCount } }` **without** writing, so the editor can show the modal; with `mode` set it writes.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/plans.test.ts
import { describe, it, expect } from "vitest";
import { POST as createPlan } from "../../app/api/plans/route";
import { POST as generate } from "../../app/api/plans/[id]/generate/route";
import { GET as getPlan } from "../../app/api/plans/[id]/route";
import { GET as listBrands } from "../../app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (url: string, m: string, b?: unknown) =>
  new Request("http://t" + url, { method: m, headers: { "content-type": "application/json", cookie: AUTH }, body: b ? JSON.stringify(b) : undefined });

async function firstBrandId() {
  const r = await listBrands(j("/api/brands", "GET"));
  return (await r.json())[0].id as string;
}

describe("/api/plans", () => {
  it("creates then generates a plan with a content gap preview", async () => {
    const brandId = await firstBrandId();
    const created = await (await createPlan(j("/api/plans", "POST", {
      brandId, title: "Eylül", rangeStart: "2026-08-28", rangeEnd: "2026-09-11",
      prompt: "2 günde bir post, her gün story, haftada 1 reels. 7 Eylül'e özel post.",
    }))).json();
    expect(created.stage).toBe("taslak");

    const preview = await (await generate(j(`/api/plans/${created.id}/generate`, "POST", {}),
      { params: Promise.resolve({ id: created.id }) })).json();
    expect(preview.ruleCount).toBeGreaterThanOrEqual(3);
    expect(typeof preview.gap).toBe("boolean");

    const written = await (await generate(j(`/api/plans/${created.id}/generate`, "POST", { mode: "extend" }),
      { params: Promise.resolve({ id: created.id }) })).json();
    expect(written.items.length).toBeGreaterThan(0);

    const full = await (await getPlan(j(`/api/plans/${created.id}`, "GET"),
      { params: Promise.resolve({ id: created.id }) })).json();
    expect(full.items).toHaveLength(written.items.length);
    expect(full.items.filter((i: any) => i.type === "story").every((i: any) => i.caption === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement the routes.** Demo source config constant: `{ postCount: 5, storyCount: 8, reelCount: 2 }`. Map `DraftItem` → item rows: `media` from asset `url`s (`kind` per asset), `sort` = index, `caption` from `MockAI` (null for story), `isGap`, `specialLabel`.
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: plans + generate + items API with gap preview"`

---

## Task 12: API — stage, comments, annotations, submit

**Files:**
- Create: `app/api/plans/[id]/stage/route.ts`, `app/api/plans/[id]/comments/route.ts`, `app/api/plans/[id]/annotations/route.ts`, `app/api/plans/[id]/submit/route.ts`, `tests/api/stage-and-feedback.test.ts`

**Interfaces:**
- Consumes: `canTransition`, `mintsPublicToken` (Task 9), `getStore`, `newToken`.
- Produces:
  - `POST /api/plans/[id]/stage` `{ to: Stage, actorName, actorRole }` → validates `canTransition(plan.stage, to)` (400 if not); if `mintsPublicToken(from,to)` sets `publicToken = newToken("c")`; updates `lastActorName`; `logActivity`. Returns `Plan`.
  - `GET/POST /api/plans/[id]/comments` — POST `{ itemId, stage, authorName, authorRole, body, status }` → `Comment` + activity.
  - `GET/POST/DELETE /api/plans/[id]/annotations` — POST `{ itemId, mediaIndex, xPct, yPct, note, stage, authorName }`; DELETE `?annotationId=`.
  - `POST /api/plans/[id]/submit` `{ round: "revize"|"onay", authorName }` → sets stage `revize_istendi` (round `revize`) or `onaylandi` (round `onay`) if current stage is `markada` (else 400); activity. Returns `{ stage }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/stage-and-feedback.test.ts
import { describe, it, expect } from "vitest";
import { POST as createPlan } from "../../app/api/plans/route";
import { POST as stage } from "../../app/api/plans/[id]/stage/route";
import { GET as listBrands } from "../../app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, { method: m, headers: { "content-type": "application/json", cookie: AUTH }, body: b ? JSON.stringify(b) : undefined });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("stage machine over HTTP", () => {
  it("mints a public token only at markaya_hazir -> markada", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
    const plan = await (await createPlan(j("/api/plans", "POST", {
      brandId, title: "T", rangeStart: "2026-09-01", rangeEnd: "2026-09-10", prompt: "her gün story",
    }))).json();

    const step = (to: string) => stage(j(`/api/plans/${plan.id}/stage`, "POST",
      { to, actorName: "Derya", actorRole: "yonetici" }), ctx(plan.id));

    expect((await step("ic_onayda")).status).toBe(200);
    let p = await (await step("markaya_hazir")).json();
    expect(p.publicToken).toBeNull();
    p = await (await step("markada")).json();
    expect(p.publicToken).toMatch(/^c_/);

    const bad = await step("taslak");
    expect(bad.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement the four routes.**
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: stage transitions, comments, annotations, submit API"`

---

## Task 13: Calendar components (shared by brand + internal)

**Files:**
- Create: `components/calendar/Carousel.tsx`, `ReelPlayer.tsx`, `PinLayer.tsx`, `ItemCard.tsx`, `GridView.tsx`, `TimelineView.tsx`, `CalendarView.tsx`
- Create: `tests/components/calendar.test.tsx`

**Interfaces:**
- Consumes: `PlanItem`, `Comment`, `Annotation` types; callback props.
- Produces:
  - `CalendarView({ plan, items, brand, mode, comments, annotations, onComment, onAnnotate, onDeleteAnnotation, onStatus })` where `mode: "brand" | "internal"`.
    - internal/brand identical UI except the banner is added by the page, not here.
  - `GridView` — CSS grid, 3 cols; `post`/`reel`/`special` in order; `story` items in a separate horizontal strip above, labeled `Story`. Cell click → opens `ItemCard` in a `Modal`.
  - `TimelineView` — date-rail + `ItemCard` stacked.
  - `ItemCard({ item, brand, comments, annotations, onComment, onAnnotate, onStatus })` — media (`Carousel` for multi-media post/special, single `<img>` for story, `ReelPlayer` for reel), type chip, caption (hidden when `item.caption === null`), status buttons `✓ Onayla` / `↺ Revize iste` (calls `onStatus(item.id, "approved"|"changes"|"none")`), comment `<form>` (calls `onComment(item.id, text)` — name prompt handled by page-level wrapper), comment list.
  - `PinLayer({ annotations, onAdd, onDelete })` — absolute layer over media; click → note popover; numbered pins.
  - Toggle in `CalendarView`: `Izgara` / `Zaman çizelgesi` (persist choice in `localStorage` key `ritim-view-mode`, default `Izgara`).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/calendar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarView } from "../../components/calendar/CalendarView";

const brand = { id: "b", name: "Pablo", logoUrl: "/demo/ph-1.svg", colorPrimary: "#2E2A26", colorAccent: "#C6963C" } as any;
const items = [
  { id: "i1", planId: "p", date: "2026-09-01", type: "post", sort: 0, caption: "Merhaba", specialLabel: null,
    media: [{ url: "/demo/ph-1.svg", kind: "image", slideOrder: 1 }], isGap: false, hidden: false },
  { id: "i2", planId: "p", date: "2026-09-02", type: "story", sort: 1, caption: null, specialLabel: null,
    media: [{ url: "/demo/ph-2.svg", kind: "image", slideOrder: 1 }], isGap: false, hidden: false },
] as any;

describe("CalendarView", () => {
  it("shows a caption for post, none for story, and fires onStatus", () => {
    const onStatus = vi.fn();
    render(<CalendarView plan={{ id: "p", title: "Eylül" } as any} brand={brand} items={items}
      mode="brand" comments={[]} annotations={[]} onComment={vi.fn()} onAnnotate={vi.fn()}
      onDeleteAnnotation={vi.fn()} onStatus={onStatus} />);
    expect(screen.getByText("Merhaba")).toBeInTheDocument();
    expect(screen.queryByText(/story/i)).toBeInTheDocument(); // strip label
    fireEvent.click(screen.getAllByRole("button", { name: /Onayla/ })[0]);
    expect(onStatus).toHaveBeenCalledWith("i1", "approved");
  });

  it("toggles between Izgara and Zaman çizelgesi", () => {
    render(<CalendarView plan={{ id: "p", title: "Eylül" } as any} brand={brand} items={items}
      mode="brand" comments={[]} annotations={[]} onComment={vi.fn()} onAnnotate={vi.fn()}
      onDeleteAnnotation={vi.fn()} onStatus={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Zaman çizelgesi" }));
    expect(screen.getByText(/01/)).toBeInTheDocument(); // date rail day
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement the components** (port visuals/tokens from `scratchpad/ritim-demo.html`). Keep each file focused; no data fetching inside — all via props.
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: shared calendar components (grid, timeline, item card, carousel, reel, pins)"`

---

## Task 14: Splash + brand view page `/c/[token]`

**Files:**
- Create: `components/Splash.tsx`, `app/c/[token]/page.tsx`, `app/c/[token]/BrandViewClient.tsx`, `tests/components/splash.test.tsx`

**Interfaces:**
- Consumes: `getStore().getPlanByToken("public", token)`, `CalendarView` (Task 13), API routes for comments/annotations/submit.
- Produces:
  - `Splash({ brandName, logoUrl, colorPrimary, title, onDone })` — fixed overlay, `background: colorPrimary`, centered logo + `brandName` + `title`; auto-dismiss after 3500ms then fade 400ms then `onDone()`; if `matchMedia("(prefers-reduced-motion: reduce)").matches` or `sessionStorage["ritim-splash-"+token]` set → 800ms; sets the sessionStorage key on dismiss.
  - `app/c/[token]/page.tsx` (server) — loads plan+brand+items+comments+annotations; if no plan or `plan.publicToken !== token` → renders a calm "Bu link artık geçerli değil" screen. Else renders `BrandViewClient`.
  - `BrandViewClient` — shows `Splash` then `CalendarView mode="brand"`; a sticky footer button **Revizeleri gönder** → calls `/api/plans/[id]/submit` with `round` = `"onay"` if every visible non-gap item has an `approved` status else `"revize"` → then replaces the screen with the confirmation text (verbatim constant from Global Constraints). Name prompt: on first `onComment`/`onAnnotate`/`onStatus`, if no `localStorage["ritim-name"]`, show a small `Modal` asking `Adınız`, store it.
  - "Güncellendi" pill in the header when `plan.version > 1` and stage is `markada`/`revize_istendi`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/splash.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Splash } from "../../components/Splash";

beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); });

describe("Splash", () => {
  it("renders brand + title then calls onDone after the full delay", () => {
    const onDone = vi.fn();
    render(<Splash brandName="Pablo" logoUrl="/demo/ph-1.svg" colorPrimary="#2E2A26"
      title="28 Ağustos – 11 Eylül Sosyal Medya Paylaşım Takvimi" onDone={onDone} storageKey="ritim-splash-x" />);
    expect(screen.getByText("Pablo")).toBeInTheDocument();
    expect(screen.getByText(/Sosyal Medya Paylaşım Takvimi/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3500 + 400); });
    expect(onDone).toHaveBeenCalled();
  });
  it("is quick on a repeat visit", () => {
    sessionStorage.setItem("ritim-splash-x", "1");
    const onDone = vi.fn();
    render(<Splash brandName="Pablo" logoUrl="/demo/ph-1.svg" colorPrimary="#2E2A26" title="t" onDone={onDone} storageKey="ritim-splash-x" />);
    act(() => { vi.advanceTimersByTime(800 + 400); });
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement `Splash`, the server page, and `BrandViewClient`.** Title string built server-side: `` `${fmt(plan.rangeStart)} – ${fmt(plan.rangeEnd)} Sosyal Medya Paylaşım Takvimi` `` with `fmt` = `d MMMM` Turkish (`Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"long"})`).
- [ ] **Step 4: Run to verify it passes** — PASS. Manual: visit a `/c/<token>` from a generated+published plan.
- [ ] **Step 5: Commit** — `git commit -am "feat: splash screen + brand calendar view with revizeleri gönder"`

---

## Task 15: Internal preview `/i/[token]`

**Files:**
- Create: `app/i/[token]/page.tsx`, `app/i/[token]/InternalClient.tsx`, `tests/e2e-helpers/noop.md` (placeholder note only — no test file; covered by E2E in Task 19)

**Interfaces:**
- Consumes: `getStore().getPlanByToken("internal", token)`, `CalendarView` (mode `internal`), `PlanEditor` (Task 17) is **not** used here — internal reviewers edit via the same `/app/plans/[id]` editor; this page is review + approve only per spec section 6.5, BUT spec section 3 says approver "edits like manager". Resolution: `/i/[token]` shows `CalendarView mode="internal"` for comments/pins/status; an **"Editörde aç"** button links to `/app/plans/[id]` (works only if the viewer has passed the team gate). Approve/send-back live here.
- Produces:
  - `app/i/[token]/page.tsx` (server) — loads by internal token; invalid → "Bu link artık geçerli değil".
  - `InternalClient` — top banner `İÇ ONAY — markaya gönderilmedi` (amber), `CalendarView mode="internal"`, name prompt (same pattern as brand), action bar: **Onayla** → `POST /api/plans/[id]/stage { to:"markaya_hazir" }` then `{ to:"markada" }` (two steps; mint token) — actually call stage once to `markaya_hazir`, then immediately once to `markada` so the public link exists on approve; show the resulting `/c/<token>` link in a toast. **Yöneticiye geri gönder** → `POST .../stage { to:"taslak" }`; requires a non-empty note (adds it as a plan-level comment on the first item with `stage:"internal"`).

- [ ] **Step 1: Write a failing test** — component test for `InternalClient` banner + buttons:

```tsx
// tests/components/internal-client.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InternalClient } from "../../app/i/[token]/InternalClient";

it("shows the internal banner and both actions", () => {
  render(<InternalClient plan={{ id: "p", title: "Eylül", stage: "ic_onayda" } as any}
    brand={{ id: "b", name: "Pablo", colorPrimary: "#2E2A26", colorAccent: "#C6963C", logoUrl: "/demo/ph-1.svg" } as any}
    items={[]} comments={[]} annotations={[]} />);
  expect(screen.getByText(/İÇ ONAY/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Onayla" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Yöneticiye geri gönder" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement the page + client.**
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: internal preview + approval surface"`

---

## Task 16: Team shell — gate, role pick, top bar, tabs

**Files:**
- Create: `app/(team)/layout.tsx`, `app/(team)/app/page.tsx`, `components/team/TopBar.tsx`, `components/team/StageBadge.tsx`, `app/(team)/gate/page.tsx` (team token + name/role form), `tests/components/topbar.test.tsx`

**Interfaces:**
- Consumes: `requireTeam`/`resolveActor` via server component reading `cookies()`; `ROLE_LABELS`, `STAGE_LABELS`.
- Produces:
  - `app/(team)/layout.tsx` (server) — if no `ritim_team` cookie → render `gate/page.tsx` content (or redirect to `/app/gate`); if team ok but no `ritim_actor` → show the name+role picker; else render `<TopBar>` + children.
  - `app/(team)/gate/page.tsx` — two-step client form: (1) team token → `POST /api/gate {kind:"team"}`; (2) name + role select (`Yönetici`/`In-house onaylayan`; a `Developer` option that reveals a password field → `POST /api/gate {kind:"developer"}` then `POST /api/role`).
  - `TopBar({ actor, activeBrand? })` — wordmark `Ritim`, active brand chip (logo + name + color dot), role label, tab links `Markalar` `/app/brands`, `Onay kuyruğu` `/app/queue`, `Developer` `/app/developer` (shown only if `ritim_dev` cookie / dev role), theme toggle.
  - `StageBadge({ stage })` — colored pill.
  - `app/(team)/app/page.tsx` — `redirect("/app/brands")`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/topbar.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopBar } from "../../components/team/TopBar";

it("hides the Developer tab for a non-developer", () => {
  render(<TopBar actor={{ name: "Derya", role: "yonetici" }} isDeveloper={false} />);
  expect(screen.getByText("Markalar")).toBeInTheDocument();
  expect(screen.queryByText("Developer")).toBeNull();
});
it("shows the Developer tab when unlocked", () => {
  render(<TopBar actor={{ name: "Kaan", role: "developer" }} isDeveloper={true} />);
  expect(screen.getByText("Developer")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify it passes** — PASS. Manual: `/app` → gate → pick role → lands on `/app/brands`.
- [ ] **Step 5: Commit** — `git commit -am "feat: team shell — gate, role picker, top bar, tabs"`

---

## Task 17: Brands tab + brand settings + new plan

**Files:**
- Create: `app/(team)/app/brands/page.tsx`, `app/(team)/app/brands/[brandId]/page.tsx`, `app/(team)/app/brands/[brandId]/plans/new/page.tsx`, `components/team/BrandCard.tsx`, `components/team/NewBrandModal.tsx`, `components/team/BrandSettings.tsx`, `tests/components/brand-card.test.tsx`

**Interfaces:**
- Consumes: `/api/brands`, `/api/brands/[id]`, `/api/plans`, `getStore` (server reads).
- Produces:
  - `BrandCard({ brand, onOpen })` — logo tile, name, IG handle; CSS hover-lift (`transform: translateY(-4px)` + shadow on `:hover`, `transition`, respects `prefers-reduced-motion`).
  - `brands/page.tsx` — grid of `BrandCard` for active brands + `＋ Marka ekle` (opens `NewBrandModal`; hidden unless `canAddBrand`). Archived shown only in Developer tab.
  - `brands/[brandId]/page.tsx` — `BrandSettings` (logo URL, primary/accent color inputs, IG handle) + plan list (title, `StageBadge`, updated time, link to editor / internal / public) + `Yeni plan` button.
  - `plans/new/page.tsx` — form: title, date range (two `<input type="date">`), source (radio: `Google Drive (bağlı)` / `Açık link` / `Manuel` — all wired to the same mock in Phase 1), prompt `<textarea>` prefilled with the demo cadence example → `POST /api/plans` → redirect to `/app/plans/[id]`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/brand-card.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrandCard } from "../../components/team/BrandCard";

it("renders the brand and fires onOpen", () => {
  const onOpen = vi.fn();
  render(<BrandCard brand={{ id: "b", name: "Elit Bakery", logoUrl: "/demo/ph-1.svg",
    instagramHandle: "elitbakery", colorPrimary: "#7A4A2B", colorAccent: "#D9982F", status: "active" } as any} onOpen={onOpen} />);
  fireEvent.click(screen.getByText("Elit Bakery"));
  expect(onOpen).toHaveBeenCalledWith("b");
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify it passes** — PASS. Manual: add a brand, open it, create a plan.
- [ ] **Step 5: Commit** — `git commit -am "feat: brands tab, brand settings, new-plan form"`

---

## Task 18: Plan editor + feedback inbox + IG reference

**Files:**
- Create: `app/(team)/app/plans/[planId]/page.tsx`, `app/(team)/app/plans/[planId]/EditorClient.tsx`, `components/team/PlanEditor.tsx`, `components/team/FeedbackInbox.tsx`, `components/team/InstagramReference.tsx`, `components/team/GapModal.tsx`, `tests/components/plan-editor.test.tsx`

**Interfaces:**
- Consumes: `/api/plans/[id]` (GET/PATCH), `/api/plans/[id]/generate`, `/api/plans/[id]/stage`, `/api/plans/[id]/comments`, `/api/plans/[id]/annotations`.
- Produces:
  - `PlanEditor({ plan, items, onChange })` — reorderable rows (drag handle via HTML5 DnD + ↑/↓ buttons), date (`<input type="date">`), type chip, thumbnail, caption `contenteditable`/`<textarea>` (disabled + `—` for story), remove `×`, gap rows styled amber with `Drive'dan seç` (Phase 1: swaps in a mock asset). Theme pickers (primary/accent `<input type="color">`) with a live preview chip. Emits the full item array on every change; parent debounces a `PATCH`.
  - `GapModal({ preview, onPick })` — shown after `generate` preview when `gap` — `Kurala kadar uzat` / `İçerikte bitir` → calls `generate` again with `mode`.
  - `FeedbackInbox({ comments, annotations, items })` — grouped by item, each entry shows `stage` (`İç` / `Marka`), `authorName`, `authorRole`, body/note, status.
  - `InstagramReference({ handle })` — Phase 1: renders a 3×3 grid of `/demo/ph-*.svg` with a caption `@<handle> — örnek feed (Phase 2'de canlı)`.
  - `EditorClient` — stitches the above + a stage action bar: `İç onaya gönder` (stage `taslak→ic_onayda`), and when `ic_onayda`, `Markaya hazırla` etc. Shows internal/public links when they exist with a `Kopyala`.
  - `plans/[planId]/page.tsx` (server) — loads plan/items/comments/annotations, 404 if missing.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/plan-editor.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanEditor } from "../../components/team/PlanEditor";

const items = [
  { id: "i1", planId: "p", date: "2026-09-01", type: "post", sort: 0, caption: "A", specialLabel: null, media: [], isGap: false, hidden: false },
  { id: "i2", planId: "p", date: "2026-09-02", type: "post", sort: 1, caption: "B", specialLabel: null, media: [], isGap: false, hidden: false },
] as any;

it("reorders rows with the down button and emits new order", () => {
  const onChange = vi.fn();
  render(<PlanEditor plan={{ id: "p", theme: { primary: "#000", accent: "#111" } } as any} items={items} onChange={onChange} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Aşağı/ })[0]);
  const lastArg = onChange.mock.calls.at(-1)![0];
  expect(lastArg.map((i: any) => i.id)).toEqual(["i2", "i1"]);
});

it("disables the caption field for a story row", () => {
  render(<PlanEditor plan={{ id: "p", theme: { primary: "#000", accent: "#111" } } as any}
    items={[{ ...items[0], type: "story", caption: null }]} onChange={vi.fn()} />);
  expect(screen.getByText("—")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify it passes** — PASS. Manual: generate → gap modal → edit → send to internal.
- [ ] **Step 5: Commit** — `git commit -am "feat: plan editor, feedback inbox, IG reference, gap modal"`

---

## Task 19: Queue + Developer tab

**Files:**
- Create: `app/(team)/app/queue/page.tsx`, `app/(team)/app/developer/page.tsx`, `tests/api/developer.test.ts`

**Interfaces:**
- Consumes: `getStore().listPlans`, `listActivity`, `/api/brands?all=1`, `/api/brands/[id]` (archive).
- Produces:
  - `queue/page.tsx` (server) — plans grouped by `stage` in `STAGE_ORDER`; `ic_onayda` group first and highlighted; each row links to editor + internal/public links.
  - `developer/page.tsx` (server) — guarded by `ritim_dev` cookie (else a password prompt reusing the gate form with `kind:"developer"`); lists **all** brands incl. archived with an `Arşivle`/`Geri al` toggle; shows `app_config` (team token, model) read-only for now; a combined `activity_log` table (latest 100).

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/developer.test.ts
import { describe, it, expect } from "vitest";
import { PATCH } from "../../app/api/brands/[id]/route";
import { GET as listBrands } from "../../app/api/brands/route";

const j = (u: string, m: string, b: unknown, cookie: string) =>
  new Request("http://t" + u, { method: m, headers: { "content-type": "application/json", cookie }, body: JSON.stringify(b) });

it("archive is refused for yönetici, allowed for developer", async () => {
  const brandId = (await (await listBrands(new Request("http://t/api/brands"))).json())[0].id;
  const asManager = await PATCH(j(`/api/brands/${brandId}`, "PATCH", { status: "archived" }, "ritim_team=1; ritim_actor=D|yonetici"),
    { params: Promise.resolve({ id: brandId }) });
  expect(asManager.status).toBe(403);
  const asDev = await PATCH(j(`/api/brands/${brandId}`, "PATCH", { status: "archived" }, "ritim_team=1; ritim_dev=1; ritim_actor=K|developer"),
    { params: Promise.resolve({ id: brandId }) });
  expect(asDev.status).toBe(200);
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.
- [ ] **Step 3: Implement pages; ensure `PATCH /api/brands/[id]` enforces `canArchiveBrand` when `status` is in the patch.**
- [ ] **Step 4: Run to verify it passes** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: approval queue + developer tab (archive, config, activity log)"`

---

## Task 20: End-to-end flow test + README

**Files:**
- Create: `playwright.config.ts`, `e2e/full-flow.spec.ts`, `README.md`
- Modify: `package.json` (scripts: `test`, `test:e2e`, `dev`, `build`)

**Interfaces:**
- Consumes: the running app (`webServer` in playwright config runs `npm run dev` on a fixed port with `RITIM_TEAM_TOKEN=ritim-dev`).

- [ ] **Step 1: Write the E2E spec**

```ts
// e2e/full-flow.spec.ts
import { test, expect } from "@playwright/test";

test("full workflow: create -> generate -> internal approve -> brand view -> revise", async ({ page, context }) => {
  await page.goto("/app");
  // gate
  await page.getByLabel(/ekip/i).fill("ritim-dev");
  await page.getByRole("button", { name: /Devam/ }).click();
  await page.getByLabel("Adınız").fill("Derya");
  await page.getByLabel("Rol").selectOption("yonetici");
  await page.getByRole("button", { name: /Gir/ }).click();

  // new brand
  await page.getByRole("button", { name: "＋ Marka ekle" }).click();
  await page.getByLabel("Marka adı").fill("Deniz Cafe");
  await page.getByRole("button", { name: "Ekle" }).click();
  await page.getByText("Deniz Cafe").click();

  // new plan
  await page.getByRole("button", { name: "Yeni plan" }).click();
  await page.getByLabel("Başlık").fill("Eylül");
  await page.getByLabel("Başlangıç").fill("2026-08-28");
  await page.getByLabel("Bitiş").fill("2026-09-11");
  await page.getByRole("button", { name: "Oluştur" }).click();

  // generate -> gap modal
  await page.getByRole("button", { name: "Takvimi üret" }).click();
  await page.getByRole("button", { name: /Kurala kadar uzat/ }).click();
  await expect(page.getByText(/POST/).first()).toBeVisible();

  // to internal
  await page.getByRole("button", { name: "İç onaya gönder" }).click();
  const internalLink = await page.getByTestId("internal-link").getAttribute("href");
  expect(internalLink).toContain("/i/");

  // internal approve
  const p2 = await context.newPage();
  await p2.goto(internalLink!);
  await p2.getByRole("button", { name: "Onayla" }).click();
  const brandLink = await p2.getByTestId("brand-link").getAttribute("href");
  expect(brandLink).toContain("/c/");

  // brand view
  const p3 = await context.newPage();
  await p3.goto(brandLink!);
  await expect(p3.getByText("Deniz Cafe")).toBeVisible();          // splash
  await expect(p3.getByRole("button", { name: "Izgara" })).toBeVisible({ timeout: 6000 });
  await p3.getByRole("button", { name: /Revize iste/ }).first().click();
  await p3.getByRole("button", { name: "Revizeleri gönder" }).click();
  await expect(p3.getByText(/Revizeleriniz ekibe iletildi/)).toBeVisible();
});
```

- [ ] **Step 2: Run to verify it fails** — `npx playwright test` → FAIL (selectors/pages missing or copy mismatch). Fix mismatches in components (add `data-testid="internal-link"` / `"brand-link"`, align button labels) until green.
- [ ] **Step 3: Write `README.md`** — what Phase 1 is, `npm i`, `npm run dev`, `npm test`, `npm run test:e2e`, the four surfaces + URLs, env vars (`RITIM_TEAM_TOKEN`, `RITIM_DEV_PASSWORD`), and a "Phase 2" list (swap `JsonStore`→Supabase, `MockAI`→Anthropic, `MockDriveSource`→Google Drive, `LocalMediaStore`→R2, live Instagram).
- [ ] **Step 4: Run the whole suite** — `npm test && npx playwright test` → all green.
- [ ] **Step 5: Commit** — `git commit -am "test: full-flow E2E + README"`

---

## Self-Review

**Spec coverage:**
- Roller/erişim → Tasks 5, 10, 16, 19. ✅
- 3 modlu Drive alımı → Task 6 (mock) + Task 17 (UI radio, all→mock in Phase 1); real OAuth is Phase 2 (noted in README). ✅ (Phase 1 scope)
- AI kural tabanlı planlama → Tasks 3, 4, 7, 11. ✅
- Plan editörü → Task 18. ✅
- İç onay akışı → Tasks 12, 15. ✅
- Marka görünümü (splash, ızgara/zaman çizelgesi, revize gönder) → Tasks 13, 14. ✅
- Marka izolasyonu → Task 14 (token check, no nav). ✅
- Instagram feed referansı → Task 18 (`InstagramReference`, mock grid; live = Phase 2). ✅ (Phase 1 scope)
- Geri bildirim kutusu → Task 18. ✅
- İşlem kaydı → Tasks 8, 12, 19. ✅
- 5 aşamalı yaşam döngüsü + token basımı → Tasks 9, 12. ✅
- Veri modeli → Task 8 (shapes match spec §7). ✅
- Splash exact copy + timing → Task 14 + Global Constraints. ✅
- Revize onay metni birebir → Task 14 + Global Constraints. ✅
- Hata ekranları (geçersiz token) → Tasks 14, 15. ✅
- Mimari modüller (`lib/*` sınırları) → File Structure + per-task Files. ✅

**Deferred to Phase 2 (documented, not gaps):** Supabase, Anthropic, Google Drive OAuth, R2, live Instagram Graph API, Vercel cron keep-alive, custom domain. Each sits behind an interface introduced in Phase 1.

**Placeholder scan:** No "TBD"/"add error handling" left; every code step has real code. Task 15 notes a spec tension (6.5 "review only" vs 3 "edits like manager") and resolves it explicitly (review+approve on `/i/`, full edit via `/app/plans/[id]`).

**Type consistency:** `Stage`/`Role`/`ItemType`/`CommentStage` string unions defined once in Task 2, reused verbatim. `newToken("i"|"c")` used consistently (Tasks 2, 8, 12). `DataStore` method names fixed in Task 8, called unchanged in Tasks 10–19. `CalendarView` prop shape fixed in Task 13, consumed in Tasks 14–15.
