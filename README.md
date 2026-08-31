# Osiris Social Calendar — Sosyal Medya Paylaşım Takvimi

Drive linklerinden ve bir metin promptundan; akışkan, videoların oynatılabildiği,
markanın **hiçbir uygulama indirmeden** bir web linkiyle açıp üzerine revize
yazabildiği bir sosyal medya paylaşım takvimi üretir.

Bu depo **Phase 1**'dir: tüm iş akışı uçtan uca çalışır, ama Drive / AI / veritabanı /
dosya deposu **sahte (mock) adaptörlerle** ve dosya tabanlı bir JSON store ile
çalışır. Hiçbir dış servise bağlanmaz, hiçbir ücret çıkmaz.

## Çalıştırma

```bash
npm install
npm run dev            # http://localhost:3000
```

İlk açılışta `/app` seni ekip kapısına götürür:

- **Ekip kodu:** `osiris-dev`  (env: `OSIRIS_TEAM_TOKEN`)
- Ardından **isim + rol** seç (Yönetici / In-house onaylayan / Developer)
- **Developer şifresi:** `dev`  (env: `OSIRIS_DEV_PASSWORD`)

## Test

```bash
npm test          # Vitest — birim + API + bileşen (83+ test)
npm run test:e2e  # Playwright — tam iş akışı (dev sunucusunu kendi başlatır)
```

## Yüzeyler

| URL | Kim | Ne |
|---|---|---|
| `/app/brands` | Ekip | Marka kartları, marka ekle, ayarlar |
| `/app/brands/[id]/plans/new` | Ekip | Prompt + tarih aralığı → yeni plan |
| `/app/plans/[id]` | Yönetici / Onaylayan | Editör: üret, sürükle-sırala, caption, tema, iç onaya gönder |
| `/app/queue` | Ekip | Aşamasına göre tüm planlar |
| `/app/developer` | Developer | Arşiv, ayarlar, işlem kaydı |
| `/i/[token]` | İç onaylayan | Takvim + "İÇ ONAY" bandı + Onayla / Geri gönder |
| `/c/[token]` | Marka | Splash → ızgara/zaman çizelgesi → yorum + iğne → Revizeleri gönder |

## İş akışı

```
Taslak → İç onayda → Markaya hazır → Markada → (Revize istendi ↔ Onaylandı)
```

`public_token` (marka linki) yalnızca "Markaya hazır → Markada" geçişinde üretilir.

## Mimari

Saf mantık modülleri framework'ten bağımsız ve tam test kapsamlı:

- `lib/planner/` — Türkçe kural ayrıştırıcı (`2 günde bir`, `her gün`, `hafta içi`,
  `haftada 1`, `güne özel`, tarih aralıkları) + slot üretimi + varlık dağıtımı + boşluk tespiti
- `lib/plan-stages.ts` — aşama geçiş makinesi
- `lib/access/` — rol çözümleme, izinler, ekip/developer kapısı

Dış servisler arayüz arkasında; Phase 1'de `Mock*` implementasyonları:

- `lib/data/` — `DataStore` arayüzü + `JsonStore` (`.data/db.json`)
- `lib/ai/` — `AIClient` arayüzü + `MockAI` (deterministik Türkçe caption)
- `lib/sources/` — `Source` arayüzü + `MockDriveSource`
- `lib/storage/` — `MediaStore` arayüzü (yerel)

## Sürüm geçmişi & revize deadline

- Her **AI üretimi** ve **markaya her yayında** (ilk yayın / revizyon yayını) öğe seti
  otomatik anlık kaydedilir; editörde **Sürüm geçmişi** panelinden "Sürümü kaydet" ile elle de
  alınabilir (plan başına son 12 sürüm tutulur).
- Bir sürüme tıklayınca **şu anki taslakla farkı** listelenir (eklenen / çıkarılan / taşınan /
  açıklama değişikliği / görsel değişikliği).
- Marka görünümünde son iki yayın arasındaki fark **"Neler değişti?"** ile açılır.
- Editörde **"Marka için revize son tarihi"** verilebilir → marka görünümünde geri sayım rozeti,
  süre dolunca kırmızı; onay kuyruğunda "⏰ süre doldu" işareti. (WhatsApp push yok — resmi API
  gerektirir; uygulama içi uyarı olarak.)

## AI özellikleri

`lib/ai/` üç iş yapar: `captions` (üretim), `rewriteCaption` (editörde satır bazında "↻ Yeniden yaz"),
`analyzeFeed` (Instagram panelinde "Feed'i analiz et" → çıkan notlar sonraki üretimde caption'lara katılır).

- `ANTHROPIC_API_KEY` **tanımlıysa** → gerçek Claude (`AnthropicAI`); değilse → deterministik `MockAI`.
- Model: `OSIRIS_AI_MODEL` (varsayılan `claude-sonnet-5`).
- Editördeki **"Görselleri AI'ya göster"** kutusu açıkken görsel URL'leri modele vision olarak gider
  (Phase 1'de görseller yerel placeholder olduğu için etkisiz).

```bash
# canlı AI için:
export ANTHROPIC_API_KEY=sk-ant-...
export OSIRIS_AI_MODEL=claude-haiku-4-5   # opsiyonel; daha ucuz
```

Tahmini maliyet (gerçek API): normal bir ajansta **aylık $1–8** — plan başına birkaç kuruş.

## Phase 2 (sıradaki)

Aynı arayüzlerin arkasına gerçek implementasyonlar takılır — UI ve route kodu değişmez:

- `JsonStore` → **Supabase** (Postgres + Auth)
- `MockDriveSource` → **Google Drive API + OAuth**
- yerel medya → **Cloudflare R2** (10 GB bedava, egress ücretsiz)
- **Instagram Graph API** ile canlı feed (şu an `InstagramPanel` sahte ızgara + `analyzeFeed` demo görseller)
- Vercel cron ile Supabase bedava katman uyku önleme
- Özel alan adı
