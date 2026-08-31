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
   | `ANTHROPIC_API_KEY` | *(opsiyonel — yoksa AI sahte çıktı verir)* |
   | `OSIRIS_AI_MODEL` | *(opsiyonel — varsayılan `claude-sonnet-5`; `claude-haiku-4-5` daha ucuz)* |

4. **Deploy**. 1-2 dakikada biter.

Adresin: `https://<proje-adı>.vercel.app` — kendi alan adı **gerekmez**.
İstersen sonra **Settings → Domains**'den `takvim.senindomainin.com` eklersin (tek CNAME).

---

## 4. Kullanım

- Ekip: `https://<proje>.vercel.app/app` → ekip kodu → isim + rol.
- Yeni plan → **İçerik** bölümünden Drive'dan indirdiğin görselleri/videoları yükle
  (yüklemezsen örnek içerikle üretir) → prompt → **Takvimi üret**.
- **İç onaya gönder** → çıkan `/i/...` linkini ekibe ver → onaylayan **Onayla** der →
  çıkan `/c/...` linkini WhatsApp'tan markaya gönder.

---

## Notlar

- **Depolama sınırları (bedava):** Supabase 500 MB veritabanı + 1 GB dosya + 5 GB/ay trafik.
  Dolarsa Supabase Pro 25 $/ay. Görsel/video Supabase Storage'da; büyük dosyalar tarayıcıdan
  doğrudan Storage'a gider (Vercel fonksiyon limitine takılmaz).
- **AI maliyeti:** `ANTHROPIC_API_KEY` koyarsan plan başına birkaç kuruş; normal kullanımda aylık $1–8.
- **Yerel çalıştırma:** Supabase env'leri olmadan `npm run dev` → `.data/db.json` + `public/uploads`
  kullanır (tek makinede sorunsuz; Vercel'de kalıcı değil, o yüzden Supabase şart).
- Ekip kodunu ve Developer şifresini kimseyle gereksiz paylaşma; `/app` adresi de gizli kalsın.
