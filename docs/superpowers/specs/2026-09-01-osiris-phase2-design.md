# Osiris Social Calendar — Phase 2 Design

Date: 2026-09-01
Status: approved-pending-review
Budget constraint: **$0 / near-zero per month.** No feature may introduce a recurring bill.

Phase 2 is five independent pieces. Each ships on its own; none blocks another.

---

## 1. Google Drive ingest (public-folder, API-key only)

**Problem.** Today the manager downloads raw edits from Drive and re-uploads them by hand.

**Approach.** Google Drive API v3 with a **server-side API key** — no OAuth, no consent
screen, no Google verification. An API key can read files that are shared
"anyone with the link", which is how the agency's shoot folders are already set.

- New env: `GOOGLE_API_KEY` (optional; feature hidden when unset).
- `BrandSource.kind` gains `"drive_folder"`. Brand settings gets a
  "Drive klasör linki" input; we parse the folder id from any Drive URL form.
- `lib/sources/drive-folder.ts` — `DriveFolderSource implements Source`:
  - `list()` → `GET https://www.googleapis.com/drive/v3/files?q='{folderId}'+in+parents+and+trashed=false&key=…&fields=files(id,name,mimeType,size)&pageSize=1000` (follows `nextPageToken`).
  - Maps each file to an `Asset` via the existing name → type/slideOrder rules
    (`slideOrderFromName`, `ITEM_TYPES` keywords).
  - `kind`: `image` / `video` from `mimeType`.
- New route `POST /api/plans/[id]/import-drive` (editor only):
  1. Resolve the plan's brand `drive_folder` source.
  2. `DriveFolderSource.list()`.
  3. For each file, stream `GET files/{id}?alt=media&key=…` → `putUpload()` into
     Supabase Storage → collect `{type,kind,url,name}`.
  4. `store.addAssets(planId, …)` + `logActivity`.
  - `maxDuration = 60`. Skips files already imported (match on `name`).
  - Per-file failure is collected, not fatal; response is
    `{ imported: n, skipped: n, failed: [{name, reason}] }`.
- UI: in the editor's content area (stage `taslak`), a "Drive'dan çek" button next
  to the uploader when the brand has a `drive_folder` source. Shows the result
  summary. Files land in the same asset list as manual uploads.

**Out of scope:** OAuth for private folders (needs a verified app — Phase 3).
Fallback stays: manual upload + "public link" paste.

---

## 2. Instagram current feed (best-effort, no Meta app)

**Reality (tested 2026-09-01 from this environment):** a bare server fetch of a
profile hits a login wall; the free WordPress screenshot service returns a blank
image for instagram.com; the private `web_profile_info` endpoint answers
"useragent mismatch" and, even spoofed, is rate-limited from datacenter IPs.
There is **no reliable free automated feed**. So Phase 2 makes automation
best-effort and always leaves a manual path.

- **"Instagram'ı Aç"** — a plain link to `https://instagram.com/{handle}` (target
  `_blank`). Always shown when the brand has a handle. 100% reliable.
- **"Feed'i otomatik çek"** — `POST /api/brands/[id]/fetch-feed`:
  - `GET https://i.instagram.com/api/v1/users/web_profile_info/?username={handle}`
    with headers `x-ig-app-id: 936619743392459`, a desktop Chrome UA, `Accept: */*`.
  - On success: pull up to 12 thumbnail URLs + posts/followers counts; **re-host
    the thumbnails** via `putUpload()` (Instagram CDN URLs expire) and store on the
    brand as `feedThumbs: string[]` + `feedFetchedAt`. `feedScreenshotUrl` is left
    as-is; the analyzer accepts either source (see below).
  - On any failure: `{ ok:false, reason }` → UI shows "otomatik alınamadı,
    ekran görüntüsü yükle" and the existing manual screenshot upload.
  - Cache: refuse to refetch within 12h unless `?force=1`.
- `analyzeFeed` input broadens: `imageUrls` = `feedThumbs ?? [feedScreenshotUrl]`.
- New brand fields: `feedThumbs: string[] | null`, `feedFetchedAt: string | null`.

**Out of scope:** official Graph API, App Review, per-brand OAuth connect.

---

## 3. Video: no transcode, two free quality fixes

Transcoding/hosting always costs money, so it stays out. Instead:

- **Playability warning.** On upload (client `ContentUploader` and the
  `assets` route), if the file extension is `.mov/.avi/.mkv/.wmv/.flv` or the
  MIME is `video/quicktime` / `video/x-msvideo`, tag the asset
  `webPlayable: false`. The editor and queue show a chip:
  "Tarayıcıda oynamayabilir — MP4 (H.264) yükleyin". Brand view shows the poster
  with the same note instead of a dead player.
- **Poster capture.** In `ContentUploader`, after a video file is chosen, load it
  into an off-screen `<video>`, seek to `t=0.1`, draw to a `<canvas>`, export
  `image/jpeg` ~0.7, upload it via `/api/uploads`, and send `posterUrl` with the
  asset. `Media`/`PlanAsset` gain `posterUrl?: string`. `ReelPlayer` uses
  `posterUrl` for the `<video poster>` and for the non-playable fallback image.

New optional fields: `PlanAsset.webPlayable?: boolean`, `PlanAsset.posterUrl?: string`,
`Media.posterUrl?: string`.

---

## 4. WhatsApp: pre-filled `wa.me` links

No WhatsApp Business API (needs business verification + template approval + a
number). Instead, one-click deep links that open WhatsApp with the message and
link already typed; the user presses send.

- `lib/whatsapp.ts` — `waLink({ phone?, text })` →
  `https://wa.me/{digits}?text={encodeURIComponent(text)}` (or no path when no phone).
- Brand gains `phone: string | null` (settings input, free text, digits only).
- Buttons:
  - Editor, when stage becomes `markaya_hazir` / on "Markaya gönder": "WhatsApp'tan
    markaya yolla" → text = short Turkish line + the `/c/{token}` URL.
  - Editor "İç onaya gönder": "WhatsApp'tan ekibe yolla" → `/i/{token}` URL.
  - Brand view "Revizeleri gönder" success: "WhatsApp'tan haber ver" → text
    reminds them revisions were sent (to the agency number if `phone` set).
- Pure client links (`<a href target=_blank>`); nothing sent server-side, so no
  confirmation gate needed.

New optional field: `Brand.phone: string | null`.

---

## 5. "Yayında" stage + publish progress bar

**Problem.** After brand approval there's no tracking of what actually went live.

- `STAGES` gains `"yayinda"` after `"onaylandi"`, and `"tamamlandi"` last.
- `PlanItem.publishedAt: string | null`.
- Stage flow: `onaylandi → (Yayına al) → yayinda → (auto when all items published) → tamamlandi`.
  "Yayına al" is an editor action in the queue/editor. Reverting `yayinda → onaylandi`
  allowed (clears `publishedAt`).
- In a `yayinda` plan: each non-gap item row gets a "Yayınlandı" toggle
  (`PATCH /api/plans/[id]/items/[itemId]/publish`). Toggling recomputes progress;
  hitting 100% auto-advances the plan to `tamamlandi` + logs activity.
- Progress bar component `PublishProgress` = `published / totalNonGap`:
  - Queue row (team), editor header, and **brand view** (read-only:
    "12 / 20 paylaşıldı" + bar in brand colors).
- `StageBadge` / `STAGE_LABELS`: `yayinda` → "Yayında", `tamamlandi` → "Tamamlandı ✓".
- Cron cleanup rule unchanged (14 days past `rangeEnd`); a `tamamlandi` plan is
  still swept on schedule.

New field: `PlanItem.publishedAt: string | null`; two new stages.

---

## Data model delta (all backfilled in `BlobStore.normalize`)

| Type | New field | Default |
|---|---|---|
| `Brand` | `phone: string \| null` | `null` |
| `Brand` | `feedThumbs: string[] \| null` | `null` |
| `Brand` | `feedFetchedAt: string \| null` | `null` |
| `BrandSource.kind` | `+ "drive_folder"` | — |
| `PlanItem` | `publishedAt: string \| null` | `null` |
| `PlanAsset` | `webPlayable?: boolean` | `undefined` (treated true) |
| `PlanAsset` | `posterUrl?: string` | `undefined` |
| `Media` | `posterUrl?: string` | `undefined` |
| `STAGES` | `+ "yayinda", "tamamlandi"` | — |

## New env

| Key | Purpose | Missing → |
|---|---|---|
| `GOOGLE_API_KEY` | Drive public-folder listing/download | Drive feature hidden |

## Testing

- `drive-folder.test.ts` — URL→folderId parsing; `list()` maps names to types/order
  (mocked `fetch`); import route records assets + reports failures.
- `fetch-feed.test.ts` — success path stores `feedThumbs`; failure path returns
  `{ok:false}` and leaves brand untouched; 12h cache guard.
- `whatsapp.test.ts` — `waLink` encoding, with/without phone.
- `publish-flow.test.ts` — `yayina al` → toggle items → auto `tamamlandi`;
  progress numbers; revert clears `publishedAt`.
- `video-poster` — unit for the extension/MIME → `webPlayable` decision.
- Existing 92 tests stay green; E2E full-flow extended with a publish step.

## Rollout / what the user must do

1. (Optional) Create a Google Cloud project → enable Drive API → make an API key →
   set `GOOGLE_API_KEY` in Vercel. Without it the Drive button just doesn't appear.
2. Nothing else — Instagram best-effort, WhatsApp links, video fixes, and the
   publish stage need no new accounts or config.
