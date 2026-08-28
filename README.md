# Ritim — Sosyal Medya Paylaşım Takvimi

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

- **Ekip kodu:** `ritim-dev`  (env: `RITIM_TEAM_TOKEN`)
- Ardından **isim + rol** seç (Yönetici / In-house onaylayan / Developer)
- **Developer şifresi:** `dev`  (env: `RITIM_DEV_PASSWORD`)

## Test

```bash
npm test          # Vitest — birim + API + bileşen (66 test)
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

## Phase 2 (sıradaki)

Aynı arayüzlerin arkasına gerçek implementasyonlar takılır — UI ve route kodu değişmez:

- `JsonStore` → **Supabase** (Postgres + Auth)
- `MockAI` → **Anthropic API** (kullandıkça öde)
- `MockDriveSource` → **Google Drive API + OAuth**
- yerel medya → **Cloudflare R2** (10 GB bedava, egress ücretsiz)
- **Instagram Graph API** ile canlı feed (şu an `InstagramReference` sahte ızgara)
- Vercel cron ile Supabase bedava katman uyku önleme
- Özel alan adı
