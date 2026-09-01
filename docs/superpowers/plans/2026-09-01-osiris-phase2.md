# Osiris Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** ✅ Complete (all 7 tasks landed 2026-09-01, commits `97259fa`..`7358fd9`). 118 unit tests + 2 Playwright flows green; `next build` clean.

**Goal:** Ship the five Phase 2 features (Drive ingest, best-effort Instagram feed, video quality fixes, wa.me links, "yayında" publish tracking) with no recurring cost.

**Architecture:** Follows Phase 1 patterns exactly — one JSON blob DB behind `BlobStore` with `normalize()` backfills, thin Next.js route handlers guarded by `requireEditor`, `Source` interface for asset providers, client components calling `fetch` + `router.refresh()`. Every new nullable field is backfilled in `BlobStore.normalize`.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, Vitest + Testing Library, Playwright, Supabase (Postgres blob + Storage).

## Global Constraints

- **Budget: $0/month.** No feature may add a recurring bill. No new paid SaaS.
- **No new runtime dependencies** unless unavoidable (none are, for this plan).
- All new env vars are **optional**; the feature hides itself when the var is unset.
- UI copy is **Turkish**, matching existing tone (plain, not flashy).
- Cookie names stay `ritim_*`. New env vars use the `OSIRIS_`/bare convention already in `.env.example`.
- `BlobStore.normalize()` must backfill every new field so old blobs keep loading.
- Existing 92 unit tests and the Playwright E2E must stay green.
- Route handlers that call AI or download files set `export const maxDuration = 60`.

---

## Task 1: Data model + stage additions

**Files:**
- Modify: `lib/types.ts` — `STAGES`, `Brand`, `BrandSource`, `Media`, `PlanItem`, `PlanAsset`, zod schemas
- Modify: `lib/data/blob-store.ts` — `normalize()`, `createBrand()`, `createPlan()` (no change needed), `normalize` brand/plan/asset/item maps
- Modify: `lib/data/seed.ts` — seed brands get `phone/feedThumbs/feedFetchedAt`
- Modify: `lib/access/roles.ts` — stage transition map (if one exists) for `yayinda`/`tamamlandi`
- Modify: `components/team/StageBadge.tsx` + wherever `STAGE_LABELS` lives
- Test: `tests/types.test.ts`, `tests/data/normalize.test.ts` (create if absent)

**Interfaces produced:**
- `STAGES` gains `"yayinda"`, `"tamamlandi"` (append, after `"onaylandi"`).
- `Brand.phone: string | null`, `Brand.feedThumbs: string[] | null`, `Brand.feedFetchedAt: string | null`
- `BrandSource.kind: "drive_oauth" | "public_link" | "manual" | "drive_folder"`
- `PlanItem.publishedAt: string | null`
- `PlanAsset.webPlayable?: boolean` (absent ⇒ treat as playable), `PlanAsset.posterUrl?: string`
- `Media.posterUrl?: string`
- `STAGE_LABELS.yayinda = "Yayında"`, `STAGE_LABELS.tamamlandi = "Tamamlandı"`

- [ ] **Step 1:** In `tests/types.test.ts`, extend the "well-formed plan" object with `mediaPurgedAt` already present — add nothing; instead add a new test: a plan item with `publishedAt: null` passes `zPlanItem`, and `zBrand` requires `phone`, `feedThumbs`, `feedFetchedAt` (a brand missing them fails).
- [ ] **Step 2:** Run `npx vitest run tests/types.test.ts` — expect FAIL (fields not in schema).
- [ ] **Step 3:** Edit `lib/types.ts`:
  - `STAGES = [..., "onaylandi", "yayinda", "tamamlandi"] as const`
  - `Brand` type + `zBrand`: add `phone: z.string().nullable()`, `feedThumbs: z.array(z.string()).nullable()`, `feedFetchedAt: z.string().nullable()`
  - `BrandSource.kind` union + its zod enum: add `"drive_folder"`
  - `Media` type + `zMedia`: add `posterUrl: z.string().optional()`
  - `PlanItem` type + `zPlanItem`: add `publishedAt: z.string().nullable()`
  - `PlanAsset` type: add `webPlayable?: boolean`, `posterUrl?: string`
- [ ] **Step 4:** Edit `lib/data/blob-store.ts` `normalize()`:
  - brands map: `phone: b.phone ?? null, feedThumbs: b.feedThumbs ?? null, feedFetchedAt: b.feedFetchedAt ?? null`
  - items map (add one): `items: (db.items ?? []).map((i) => ({ ...i, publishedAt: i.publishedAt ?? null }))`
  - `createBrand`: add `phone: null, feedThumbs: null, feedFetchedAt: null` to the literal
  - `replaceItems`: new items get `publishedAt: null` (add to the `.map`)
- [ ] **Step 5:** Edit `lib/data/seed.ts` — both seed brand literals get `phone: null, feedThumbs: null, feedFetchedAt: null`.
- [ ] **Step 6:** Edit `components/team/StageBadge.tsx` / `STAGE_LABELS`: `yayinda: "Yayında"`, `tamamlandi: "Tamamlandı"`. Badge shows `✓` prefix for `tamamlandi` like it does for `onaylandi`.
- [ ] **Step 7:** `npx vitest run` — expect ALL green (fix any other literal Plan/Brand/Item constructions the compiler flags; `npx tsc --noEmit` must be clean).
- [ ] **Step 8:** Commit: `feat: phase2 data model — yayında/tamamlandı stages, brand phone/feedThumbs, item publishedAt, asset poster/webPlayable`

---

## Task 2: wa.me link helper + buttons

**Files:**
- Create: `lib/whatsapp.ts`
- Create: `tests/whatsapp.test.ts`
- Modify: `components/team/EditorClient.tsx` (or wherever "İç onaya gönder" / "Markaya gönder" live) — add link buttons
- Modify: `app/c/[token]/BrandViewClient.tsx` — "WhatsApp'tan haber ver" after revisions sent
- Modify: brand settings form (`components/team/BrandDetail.tsx`) — `phone` input

**Interfaces produced:**
- `waLink(opts: { phone?: string | null; text: string }): string` — returns `https://wa.me/<digits>?text=<enc>` (path omitted when no phone/blank). Strips all non-digits from `phone`.

- [ ] **Step 1:** `tests/whatsapp.test.ts`: `waLink({ text: "merhaba" })` → `"https://wa.me/?text=merhaba"`; `waLink({ phone: "+90 (532) 111 22 33", text: "a b" })` → `"https://wa.me/905321112233?text=a%20b"`; empty text throws.
- [ ] **Step 2:** Run it — FAIL (module missing).
- [ ] **Step 3:** Write `lib/whatsapp.ts`:
```ts
export function waLink({ phone, text }: { phone?: string | null; text: string }): string {
  if (!text.trim()) throw new Error("waLink: text required");
  const digits = (phone ?? "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
```
- [ ] **Step 4:** Run it — PASS.
- [ ] **Step 5:** `BrandDetail.tsx`: add a "Telefon (WhatsApp)" text input bound to `phone`, PATCHing `/api/brands/[id]` (add `"phone"` to that route's `EDITABLE` list). `aria-label="Telefon"`.
- [ ] **Step 6:** In the editor, where the internal/brand links are shown: add `<a target="_blank" rel="noopener" href={waLink({ phone: brand.phone, text: `${brand.name} — sosyal medya takvimi hazır: ${origin}/c/${plan.publicToken}` })}>` styled as a button "WhatsApp'tan markaya yolla" (only when `plan.publicToken`). Same pattern for internal: text with `/i/${plan.internalToken}`, label "WhatsApp'tan ekibe yolla".
- [ ] **Step 7:** `BrandViewClient.tsx`: after "Revizeleri gönder" success state, show `<a target="_blank" href={waLink({ text: "Revizeleri gönderdim, kontrol edebilir misiniz?" })}>WhatsApp'tan haber ver</a>`.
- [ ] **Step 8:** `npx vitest run && npx tsc --noEmit` green. Commit: `feat: wa.me pre-filled WhatsApp links + brand phone field`

---

## Task 3: Video playability warning + poster capture

**Files:**
- Modify: `lib/uploads.ts` — add `isWebPlayableVideo(nameOrType: string): boolean`
- Modify: `app/api/plans/[id]/assets/route.ts` — set `webPlayable` on incoming video assets; accept `posterUrl`
- Modify: `components/team/ContentUploader.tsx` — capture poster frame client-side before recording the asset
- Modify: `components/calendar/ReelPlayer.tsx` — use `posterUrl`; non-playable → poster + note
- Modify: `lib/generate.ts` — carry `posterUrl` from asset → item media
- Test: `tests/uploads.test.ts` (create), `tests/api/assets.test.ts` (extend if exists)

**Interfaces produced:**
- `isWebPlayableVideo(s: string): boolean` — false for `.mov/.avi/.mkv/.wmv/.flv`, `video/quicktime`, `video/x-msvideo`, `video/x-matroska`; true otherwise.
- `assets` POST body items accept optional `posterUrl: string`.
- Item media objects carry `posterUrl` when the source asset had one.

- [ ] **Step 1:** `tests/uploads.test.ts`: `isWebPlayableVideo("clip.mov")` false, `isWebPlayableVideo("video/quicktime")` false, `isWebPlayableVideo("reel.mp4")` true, `isWebPlayableVideo("video/mp4")` true.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Add to `lib/uploads.ts`:
```ts
const NOT_WEB_PLAYABLE = /\.(mov|avi|mkv|wmv|flv)$|quicktime|x-msvideo|x-matroska/i;
export function isWebPlayableVideo(nameOrType: string): boolean {
  return !NOT_WEB_PLAYABLE.test(nameOrType);
}
```
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** `assets/route.ts`: in the `staged` map, for `kind === "video"` set `webPlayable: isWebPlayableVideo(a.name)`, and pass through `posterUrl: a.posterUrl` when present. Extend `IncomingAsset` type.
- [ ] **Step 6:** `tests/api/queue-actions.test.ts` or a new `tests/api/assets.test.ts`: POST a `.mov` video asset → GET assets → `webPlayable === false`; POST `.mp4` → `webPlayable !== false`.
- [ ] **Step 7:** `ContentUploader.tsx`: add `async function grabPoster(file: File): Promise<string | null>` — create `<video>` object URL, `muted`, `preload=metadata`, on `loadeddata` seek to `0.1`, on `seeked` draw to a `<canvas>` at natural size, `canvas.toBlob` jpeg 0.7, POST to `/api/uploads` (multipart `file`), return `{url}` or null on any error/timeout(4s). For each chosen video file, call it and include `posterUrl` in the `items` POST body. Wrap in try/catch — poster is best-effort.
- [ ] **Step 8:** `ReelPlayer.tsx`: `const poster = media.posterUrl ?? null;` playable video → `<video poster={poster ?? undefined} …>`. If `media.webPlayable === false` OR (`kind==="video"` && no url): show poster `<img>` (or existing placeholder) with note "Tarayıcıda oynamayabilir — MP4 (H.264) yükleyin". Thread `webPlayable`/`posterUrl` through the `media` prop type.
- [ ] **Step 9:** `lib/generate.ts`: where item `media` is built from assets, copy `posterUrl: asset.posterUrl`. `Media` already has the optional field from Task 1.
- [ ] **Step 10:** `npx vitest run && npx tsc --noEmit` green. Commit: `feat: video web-playability warning + client-side poster frame capture`

---

## Task 4: "Yayında" stage + publish progress

**Files:**
- Create: `app/api/plans/[id]/publish/route.ts` — PATCH toggles an item's `publishedAt`; POST advances stage
- Create: `components/team/PublishProgress.tsx` — shared progress bar
- Create: `components/team/PublishPanel.tsx` — item list with "Yayınlandı" toggles (team, stage `yayinda`)
- Modify: `app/api/plans/[id]/stage/route.ts` — allow `onaylandi → yayinda` and `yayinda → onaylandi`
- Modify: `components/team/EditorClient.tsx` — "Yayına al" button when `stage === "onaylandi"`; render `PublishPanel` when `yayinda`
- Modify: `components/team/QueueRow.tsx` — show `PublishProgress` for `yayinda`/`tamamlandi`
- Modify: `app/c/[token]/BrandViewClient.tsx` — read-only `PublishProgress` when `yayinda`/`tamamlandi`
- Test: `tests/api/publish-flow.test.ts`

**Interfaces produced:**
- `PATCH /api/plans/[id]/publish` body `{ itemId: string, published: boolean }` → sets `publishedAt` to now or null; if that makes all non-gap items published, auto-advance plan to `tamamlandi` + `logActivity`; returns `{ plan, items }`.
- `POST /api/plans/[id]/publish` body `{ action: "start" }` → stage `onaylandi` → `yayinda` (editor only); `{ action: "revert" }` → `yayinda`/`tamamlandi` → `onaylandi`, clears every `publishedAt` for the plan.
- `<PublishProgress published={n} total={m} color={hex} />` — bar + "n / m paylaşıldı".
- `publishStats(items): { published: number; total: number }` exported from `PublishProgress.tsx` — `total` = items where `!isGap && !hidden`.

- [ ] **Step 1:** `tests/api/publish-flow.test.ts`: seed plan + generate items + stage it to `onaylandi` (walk the stage route or set directly). `POST /publish {action:"start"}` → plan.stage `yayinda`. `PATCH /publish` each non-gap item `published:true` → last one flips stage to `tamamlandi`. `POST /publish {action:"revert"}` → stage `onaylandi`, all `publishedAt` null. Non-editor `PATCH` → 403.
- [ ] **Step 2:** Run — FAIL (route missing).
- [ ] **Step 3:** Write `app/api/plans/[id]/publish/route.ts` (`maxDuration` not needed). Use `requireEditor`, `getStore()`, `store.updateItem`, `store.updatePlan`, `store.listItems`, `store.logActivity`. `publishStats` logic inline or imported.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** `stage/route.ts`: add the two transitions to whatever transition guard it uses (or if it's permissive, just ensure labels/guards don't reject them).
- [ ] **Step 6:** Write `components/team/PublishProgress.tsx` (server-safe, no hooks): `export function publishStats(items)`, `export function PublishProgress({published,total,color})` — a div bar `width: ${pct}%` in `color`, text below.
- [ ] **Step 7:** Write `components/team/PublishPanel.tsx` (`"use client"`): lists non-gap items with date + type + a checkbox "Yayınlandı"; on change `PATCH /api/plans/${id}/publish` then `router.refresh()`. Renders `PublishProgress` on top.
- [ ] **Step 8:** `EditorClient.tsx`: when `stage === "onaylandi"` show "Yayına al" (POST `{action:"start"}` + refresh). When `stage === "yayinda"` render `<PublishPanel>`. When `yayinda`/`tamamlandi` show a "Yayına dönüşü geri al" link (revert).
- [ ] **Step 9:** `QueueRow.tsx`: for `yayinda`/`tamamlandi` show `<PublishProgress>` using `publishStats(plan items)` — the queue page already lists plans; pass item counts down (extend the query in `app/app/queue/page.tsx` to include `publishStats`).
- [ ] **Step 10:** `BrandViewClient.tsx`: when `stage` is `yayinda`/`tamamlandi`, show `<PublishProgress>` (read-only) in brand colors near the header.
- [ ] **Step 11:** `npx vitest run && npx tsc --noEmit` green. Commit: `feat: yayında/tamamlandı stages + publish progress (team, queue, brand view)`

---

## Task 5: Google Drive public-folder ingest

**Files:**
- Create: `lib/sources/drive-folder.ts` — `parseDriveFolderId`, `DriveFolderSource`
- Create: `app/api/plans/[id]/import-drive/route.ts` — `maxDuration = 60`
- Modify: `lib/types.ts` — nothing (kind added in Task 1)
- Modify: `components/team/BrandDetail.tsx` — "Drive klasör linki" input → saves a `drive_folder` `BrandSource`
- Modify: `app/api/brands/[id]/sources` or existing source route — accept `drive_folder` create
- Modify: `components/team/EditorClient.tsx` / `ContentUploader.tsx` — "Drive'dan çek" button when brand has a `drive_folder` source and `GOOGLE_API_KEY` set
- Modify: `.env.example`, `DEPLOY.md` — `GOOGLE_API_KEY`
- Test: `tests/sources/drive-folder.test.ts`, `tests/api/import-drive.test.ts`

**Interfaces produced:**
- `parseDriveFolderId(url: string): string | null` — handles `/folders/<id>`, `?id=<id>`, and a bare id.
- `class DriveFolderSource implements Source` — ctor `(folderId: string, apiKey: string)`; `list()` returns `Asset[]` (paginates `drive/v3/files`).
- `POST /api/plans/[id]/import-drive` (editor) → `{ imported: number; skipped: number; failed: { name: string; reason: string }[] }`. 400 when no `GOOGLE_API_KEY` or no `drive_folder` source.
- `driveDownloadUrl(id, key)` → `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`

- [ ] **Step 1:** `tests/sources/drive-folder.test.ts`: `parseDriveFolderId("https://drive.google.com/drive/folders/1AbC-dEf?usp=sharing")` → `"1AbC-dEf"`; `?id=` form; bare id; garbage → null. Then `DriveFolderSource.list()` with a stubbed `global.fetch` returning two pages of `{files:[{id,name,mimeType}]}` → maps `"post-kaydirmali 1.jpg"` to `{type:"post",kind:"image",slideOrder:1}` and `"reel_1.mp4"` to `{type:"reel",kind:"video"}`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Write `lib/sources/drive-folder.ts`. `list()`: loop `fetch(listUrl + pageToken)`, accumulate, map via existing `slideOrderFromName` + a small `typeFromName` (reuse the keyword logic from `assets/route.ts` — extract it to `lib/sources/classify.ts` if duplicated). `url` field = `driveDownloadUrl(file.id, key)` (used server-side only).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** `tests/api/import-drive.test.ts`: stub `fetch` for list + per-file `alt=media` (return small `Blob`/`ArrayBuffer`); stub Supabase by running with the JSON store + local uploads (`putUpload` writes to `public/uploads` in tests). Create brand, add a `drive_folder` source (directly via store or the sources route), create plan, `POST /import-drive` → `{ imported: 2 }`, and `GET /assets` shows 2. Second call → `skipped: 2`.
- [ ] **Step 6:** Write `app/api/plans/[id]/import-drive/route.ts`: `requireEditor`; load plan + brand + brand sources; find `kind==="drive_folder"`; `new DriveFolderSource(folderId, process.env.GOOGLE_API_KEY!)`; `list()`; filter out names already in `store.listAssets`; for each, `fetch(driveDownloadUrl)` → `Buffer.from(await res.arrayBuffer())` → `putUpload({name, contentType, bytes})` → collect; `store.addAssets`; `logActivity`; return summary. try/catch per file → `failed[]`.
- [ ] **Step 7:** `BrandDetail.tsx`: "Drive klasör linki" input; on save, POST a source `{ kind:"drive_folder", label:"Google Drive klasörü", config:{ folderId } }` (parse client-side with a copy of the regex, or send raw url and parse server-side — prefer server-side: send `{ url }`). Show the saved folder id + a "Kaldır" button.
- [ ] **Step 8:** Sources route: accept `drive_folder` kind (add to its zod/allow-list). If no dedicated route, add `POST/DELETE /api/brands/[id]/sources`.
- [ ] **Step 9:** `ContentUploader.tsx` (or EditorClient content area): if `brand` has a `drive_folder` source, render "Drive'dan çek" button → `POST /api/plans/${id}/import-drive`, show `imported/skipped/failed` summary, `router.refresh()`. Hide entirely if the API returns the "no GOOGLE_API_KEY" 400 (or better: pass a `driveEnabled` boolean from a server component that checks `process.env`).
- [ ] **Step 10:** `.env.example`: `GOOGLE_API_KEY=` with a comment (Drive public-folder read; feature hidden when unset). `DEPLOY.md`: a row + a short "nasıl alınır" note (Google Cloud Console → APIs & Services → enable Drive API → Credentials → API key; restrict to Drive API).
- [ ] **Step 11:** `npx vitest run && npx tsc --noEmit` green. Commit: `feat: Google Drive public-folder ingest via API key`

---

## Task 6: E2E + docs + full green

**Files:**
- Modify: `e2e/full-flow.spec.ts` — after brand approval, walk `Yayına al` → mark all items published → assert `Tamamlandı`
- Modify: `README.md` / `DEPLOY.md` — Phase 2 feature list, "what needs config" (only `GOOGLE_API_KEY`)
- Modify: `app/app/developer/page.tsx` — show whether `GOOGLE_API_KEY` is set (like it shows the AI provider)

- [ ] **Step 1:** Extend `e2e/full-flow.spec.ts`: from the existing internal-approve step, continue — approve as brand isn't needed; drive the team editor: click "Yayına al", expect stage badge "Yayında", tick every "Yayınlandı" checkbox, expect "Tamamlandı" and "paylaşıldı" progress at 100%.
- [ ] **Step 2:** `preview_stop` any dev server, then `npx playwright test` — PASS.
- [ ] **Step 3:** `npx next build` — clean.
- [ ] **Step 4:** Update `DEPLOY.md` + `.env.example` final state; `developer/page.tsx` shows `GOOGLE_API_KEY` presence.
- [ ] **Step 5:** `npx vitest run` (all), `npx tsc --noEmit`, `npx playwright test` — all green.
- [ ] **Step 6:** Commit: `test: e2e covers publish flow; docs: phase 2`. Push.

---

## Self-Review

**Spec coverage:**
- §1 Drive ingest → Task 5 ✅
- §2 Instagram feed → **Task 7 below** (was missing — added)
- §3 Video fixes → Task 3 ✅
- §4 wa.me → Task 2 ✅
- §5 yayında/progress → Task 4 ✅
- Data model delta → Task 1 ✅ (feedThumbs/feedFetchedAt used by Task 7)
- Env `GOOGLE_API_KEY` → Task 5 ✅
- Testing list → each task carries its tests; Task 6 does E2E ✅

**Type consistency:** `publishStats` defined in Task 4 Step 6, consumed in Task 4 Step 9 — same name. `waLink` signature identical in Task 2 Steps 1/3/6. `isWebPlayableVideo` identical Task 3 Steps 1/3/5. `parseDriveFolderId`/`DriveFolderSource` identical Task 5 Steps 1/3/6. `Media.posterUrl` added Task 1, used Task 3. OK.

**Placeholder scan:** no TBD/TODO; code blocks present for each helper. Task 5 Step 3 references extracting `classify.ts` "if duplicated" — make that concrete: extract `typeFromName` now.

---

## Task 7: Instagram best-effort feed fetch

**Files:**
- Create: `lib/instagram.ts` — `fetchWebProfile(handle): Promise<{ thumbs: string[]; posts: number; followers: number } | null>`
- Create: `app/api/brands/[id]/fetch-feed/route.ts` — `maxDuration = 60`
- Modify: `components/team/InstagramPanel.tsx` — "Instagram'ı Aç" link (always) + "Feed'i otomatik çek" button + render `feedThumbs` grid, fallback text on failure
- Modify: `app/api/plans/[id]/analyze-feed/route.ts` — accept `feedThumbs` as image source
- Test: `tests/instagram.test.ts`, `tests/api/fetch-feed.test.ts`

**Interfaces produced:**
- `fetchWebProfile(handle: string)` — GET `https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}` with headers `{ "x-ig-app-id": "936619743392459", "user-agent": "<desktop chrome UA>", accept: "*/*" }`; parse `data.user.edge_owner_to_timeline_media.edges[].node.thumbnail_src` (up to 12); return `null` on non-200, parse error, or empty.
- `POST /api/brands/[id]/fetch-feed` (editor) → `{ ok: true, thumbs: string[] } | { ok: false, reason: string }`. Re-hosts thumbs via `putUpload`. Refuses within 12h of `feedFetchedAt` unless `?force=1` → `{ ok:false, reason:"cache" }` (UI treats as "kısa süre önce çekildi").
- `analyzeFeed` uses `brand.feedThumbs ?? (brand.feedScreenshotUrl ? [brand.feedScreenshotUrl] : [])`; still returns `needsScreenshot:true` when both empty.

- [ ] **Step 1:** `tests/instagram.test.ts`: stub `global.fetch`. 200 with a realistic `web_profile_info` JSON → `thumbs.length` 2, `followers` parsed. 401 body `{message:"useragent mismatch"}` → `null`. Network throw → `null`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Write `lib/instagram.ts` per interface. Keep the UA string as a module const.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** `tests/api/fetch-feed.test.ts`: stub `fetch` for the profile call (success) + the thumb image GETs. Create brand, `POST /fetch-feed` → `{ok:true}`, brand now has `feedThumbs.length===2`, `feedFetchedAt` set. Immediate second call → `{ok:false, reason:"cache"}`. Stub a 401 → `{ok:false}` and brand unchanged. Non-editor → 403.
- [ ] **Step 6:** Write `app/api/brands/[id]/fetch-feed/route.ts`: `requireEditor`; load brand; 12h cache guard on `feedFetchedAt` unless `?force=1`; `fetchWebProfile(brand.instagramHandle)`; if null → `{ok:false, reason:"fetch"}`; else download each thumb (`fetch` → `putUpload`) best-effort, `store.updateBrand(id, { feedThumbs, feedFetchedAt: now })`; return `{ok:true, thumbs}`.
- [ ] **Step 7:** `analyze-feed/route.ts`: change the image-source line to prefer `feedThumbs`. Update its two existing tests in `tests/api/ai-features.test.ts` only if they break (they set `feedScreenshotUrl`; still valid).
- [ ] **Step 8:** `InstagramPanel.tsx`: always show `<a target="_blank" href={`https://instagram.com/${handle}`}>Instagram'ı Aç</a>`. Add "Feed'i otomatik çek" → `POST /api/brands/${brandId}/fetch-feed`; on `{ok:true}` render the thumb grid; on `{ok:false}` show "Otomatik alınamadı — aşağıdan ekran görüntüsü yükleyebilirsin" above the existing uploader. Keep the manual screenshot upload + "Analiz et".
- [ ] **Step 9:** `npx vitest run && npx tsc --noEmit` green. Commit: `feat: best-effort Instagram feed fetch + open link`

> Task 7 runs before Task 6 (E2E/docs). Execution order: 1 → 2 → 3 → 4 → 5 → 7 → 6.
