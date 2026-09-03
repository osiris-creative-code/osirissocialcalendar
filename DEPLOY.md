# Osiris Social Calendar'i bugün yayına alma (Vercel + Supabase)

Süre: ~15 dakika. Hepsi bedava katman.

---

## 1. Supabase (kalıcı veri + dosya)

1. https://supabase.com → **New project** (bölge: sana yakın olan, örn. Frankfurt ya da Mumbai).
2. Proje açılınca → sol menü **SQL Editor** → **New query** → bu depodaki
   [`supabase/schema.sql`](supabase/schema.sql) dosyasının tamamını yapıştır → **Run**.
   (Bir tablo + bir depolama kovası oluşturur.)
3. **Project Settings → API** sayfasından şunları not al:
   - `Project URL`  → `SUPABASE_URL`
   - `service_role` **secret** (⚠️ "anon" değil, "service_role") → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. GitHub

```bash
git remote add origin https://github.com/<kullanıcı>/<repo>.git
git push -u origin main
```

(Repo yoksa GitHub'da boş bir repo aç, adresini yukarıya koy.)

---

## 3. Vercel

1. https://vercel.com → **Add New → Project** → GitHub repo'yu seç → **Import**.
2. Framework otomatik **Next.js** algılanır. Build ayarına dokunma.
3. **Environment Variables** bölümüne şunları gir (hepsi "Production, Preview, Development"):

   | Key | Değer |
   |---|---|
   | `OSIRIS_TEAM_TOKEN` | ekibin gireceği kod (kendin belirle) |
   | `OSIRIS_DEV_PASSWORD` | Developer sekmesi şifresi |
   | `SUPABASE_URL` | 1. adımdaki Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 1. adımdaki service_role secret |
   | `CRON_SECRET` | uzun rastgele metin — günlük dosya temizliği bunsuz çalışmaz |
   | `GOOGLE_API_KEY` | *(opsiyonel — Drive klasöründen içe aktarma; yoksa "Drive'dan çek" gizli)* |
   | `ANTHROPIC_API_KEY` | *(opsiyonel — yoksa AI sahte çıktı verir)* |
   | `OSIRIS_AI_MODEL` | *(opsiyonel — varsayılan `claude-sonnet-5`; `claude-haiku-4-5` daha ucuz)* |

4. **Deploy**. 1-2 dakikada biter.

Adresin: `https://<proje-adı>.vercel.app` — kendi alan adı **gerekmez**.
İstersen sonra **Settings → Domains**'den `takvim.senindomainin.com` eklersin (tek CNAME).

---

## 4. Kullanım

- Ekip: `https://<proje>.vercel.app/app` → ekip kodu → isim + rol.
- Yeni plan → bu çekimin **Drive klasör linkini** yapıştır (opsiyonel) → **İçerik** bölümünde
  **Drive'dan çek** ya da elle yükle (yüklemezsen örnek içerikle üretir) → prompt → **Takvimi üret**.
- **İç onaya gönder** → çıkan `/i/...` linkini ekibe ver → onaylayan **Onayla** der →
  çıkan `/c/...` linkini WhatsApp'tan markaya gönder.

---

## Notlar

- **Depolama sınırları (bedava):** Supabase 500 MB veritabanı + 1 GB dosya + 5 GB/ay trafik.
  Dolarsa Supabase Pro 25 $/ay. Görsel/video Supabase Storage'da; büyük dosyalar tarayıcıdan
  doğrudan Storage'a gider (Vercel fonksiyon limitine takılmaz).
- **AI maliyeti:** `ANTHROPIC_API_KEY` koyarsan plan başına birkaç kuruş; normal kullanımda aylık $1–8.
- **Drive'dan içe aktarma:** `GOOGLE_API_KEY` koyarsan (Google Cloud Console → Drive API'yi etkinleştir →
  Credentials → "API key" oluştur, Drive API'ye kısıtla), **her planda** o çekimin "bağlantısı olan
  herkes"e açık Drive klasör linkini girip **Drive'dan çek** ile içeri aktarırsın. Klasör özyinelemeli
  taranır: `POST` / `STORY` / `REELS` (ve `… EK`) alt klasörleri tiplerine göre alınır, `CROP` klasörleri
  atlanır, `KAYDIRMALI 1/2/3` alt klasörleri tek bir carousel olur. OAuth/onay ekranı yok.
- **Otomatik temizlik:** Vercel Cron her gün 03:00 UTC'de `/api/cron/cleanup` çağırır; takvim
  bitiş tarihinden (rangeEnd) 14 gün geçmiş planların yüklenen görsel/videolarını Storage'dan
  siler. Plan, caption ve yorumlar kalır — sadece dosyalar gider. `CRON_SECRET` tanımlı olmalı.
  Elle tetiklemek: `curl -H "Authorization: Bearer $CRON_SECRET" https://<proje>.vercel.app/api/cron/cleanup`.
- **Yerel çalıştırma:** Supabase env'leri olmadan `npm run dev` → `.data/db.json` + `public/uploads`
  kullanır (tek makinede sorunsuz; Vercel'de kalıcı değil, o yüzden Supabase şart).
- Ekip kodunu ve Developer şifresini kimseyle gereksiz paylaşma; `/app` adresi de gizli kalsın.
