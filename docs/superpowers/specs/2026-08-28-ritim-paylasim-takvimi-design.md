# Ritim — Sosyal Medya Paylaşım Takvimi Aracı — Tasarım Dokümanı

**Tarih:** 2026-08-28
**Durum:** Onaylandı, implementasyona hazır

---

## 1. Amaç

Sosyal medya yöneticisinin, Google Drive linklerinden ve bir metin promptundan yola çıkarak;
akışkan, animasyonlu, videoların oynatılabildiği bir sosyal medya paylaşım takvimi üretmesini sağlayan araç.
Takvim, markanın **hiçbir uygulama indirmeden**, WhatsApp'tan gelen bir web linkiyle açıp inceleyebileceği,
üzerine revize/yorum yazabileceği bir web sayfası olarak yayınlanır.

Bugünkü manuel süreç (Canva taslağı + PDF + videoları elle WhatsApp'tan gönderme) yerine geçer.

### Başarı kriterleri

- Yönetici, 3 Drive kaynağından birini seçip prompt yazarak < 5 dakikada yayına hazır taslak üretebilir.
- Marka linki herhangi bir tarayıcıda (mobil dahil), giriş/kurulum olmadan açılır; videolar tıklayınca oynar.
- Marka öğe bazında yorum + görsel üzerinde iğneli not bırakabilir, tek butonla revizeleri iletir.
- Markaya gitmeden önce zorunlu bir iç onay aşaması vardır.
- Aylık işletme maliyeti pratikte 0 (bedava servis katmanları + kullandıkça ödenen AI).

---

## 2. Kapsam

### Dahil (v1)

- Marka yönetimi (ekle / arşivle, logo + 2 renk + Instagram kullanıcı adı + Drive klasörleri).
- 3 modlu Drive alımı: Google OAuth (otomatik), herkese açık link, manuel yükleme.
- AI planlama: prompt → yapılandırılmış tarihli plan + caption taslakları. Kural tabanlı (tarih aralığı + tekrar ritmi + çoklu kural).
- Plan editörü: sürükle-bırak, caption düzenleme, öğe ekle/sil, tarih değiştir, tema/renk.
- İç onay aşaması: ayrı iç önizleme linki, isimle giriş, öğe yorumu + iğne + Onayla / Geri gönder.
- Marka görünümü: splash → ızgara / zaman çizelgesi → öğe yorumu + iğne + Onayla / Revize iste → "Revizeleri gönder".
- Rol tabanlı erişim: Developer, Yönetici, In-house onaylayan, Marka.
- Mevcut Instagram feed'i referans ızgarası (bağlı hesap veya yüklenen ekran görüntüsü).
- Geri bildirim kutusu: tüm yorum/iğneler, hangi aşamada ve kim tarafından bırakıldığı.
- İşlem kaydı (audit log): kim (isim + rol) ne zaman ne yaptı.

### Hariç (v1 — sonra)

- Trello entegrasyonu.
- WhatsApp'tan otomatik mesaj gönderme (yönetici linki elle paylaşır; marka onay ekranında elle haber verir).
- E-posta bildirimi (yalnızca panel içi canlı geri bildirim kutusu).
- Instagram'a doğrudan paylaşım.
- Çoklu dil (yalnızca Türkçe).
- Yukarı akış (çekim → edit → reels → onay → Trello kartı) — aynen kalır, araç "yöneticinin elinde Drive linkleri var" noktasında başlar.

---

## 3. Roller ve erişim

| Rol | Giriş | Görebildiği | Yapabildiği |
|---|---|---|---|
| **Developer** | İsim + şifre | Her şey | Tüm planlar; marka ekle **ve çıkar/arşivle**; ekip erişimi, Drive bağlantısı, Claude API anahtarı, genel ayarlar |
| **Yönetici** | Sadece isim | Tüm markalar, tüm aşamalar | Plan oluştur/düzenle, iç onaya gönder, markaya yayınla, marka **ekle** (çıkaramaz) |
| **In-house onaylayan** | Sadece isim | Tüm markalar, tüm aşamalar | Yönetici gibi **düzenler** + yorum/iğne + **Onayla / Yöneticiye geri gönder** |
| **Marka** | Sadece link (şifresiz) | **Yalnız kendi** markasının yayınlanmış takvim(ler)i | Öğe yorumu + iğne + Onayla / Revize iste; "Revizeleri gönder"; ilk etkileşimde ad sorulur |

### Erişim mekanizması

- **Ekip alanı** (`/app/*`): tahmin edilemez bir ekip adresinin (hiçbir yerde yayınlanmayan URL / paylaşılan gizli yol) arkasında. Oradan isim + rol seçilir. Yönetici ve onaylayan kişisel şifre yönetmez.
- **Developer sekmesi**: ayrıca isim + şifre ile (tek gerçek kimlik bilgisi; hash'lenmiş saklanır).
- **Marka görünümü** (`/c/<public_token>`): tahmin edilemez token, giriş yok, yalnız o markaya kapsanmış.
- **İç önizleme** (`/i/<internal_token>`): tahmin edilemez token; isimle giriş; editör + onay aksiyonları.
- Gerçek oturum kimliği zayıf olduğu için her yorum/iğne/işlem `actor_name` + `actor_role` + zaman damgasıyla `activity_log`'a yazılır.

---

## 4. Ekip tarafı sekmeleri

1. **Markalar** — logo kartları (mouse üzerine gelince hafifçe yükselir). "＋ Marka ekle" (yönetici + developer). Arşivle (developer).
   Karta tıkla → o markanın planları + ayar paneli (logo, ana renk, vurgu renk, Instagram kullanıcı adı, Drive kaynakları).
2. **Onay kuyruğu** — aşamasına göre tüm planlar; "İç onayda" olanlar öne çıkar. Plana tıkla → editör / iç önizleme.
3. **Developer** — yalnız developer şifresiyle görünür. Yukarıdakilerin hepsi + sistem ayarları + arşiv + işlem kaydı.

Marka görünümü ve iç önizleme kendi linklerinde; oradan başka sekmeye geçiş yok.

---

## 5. Plan yaşam döngüsü

```
Taslak  ──"İç onaya gönder"──▶  İç onayda
İç onayda ──"Onayla"──▶ Markaya hazır ──"Markaya gönder" (public_token üretilir)──▶ Markada
İç onayda ──"Yöneticiye geri gönder"──▶ Taslak (notlar üstte listelenir)
Markada ──marka "Revize iste" + "Revizeleri gönder"──▶ Revize istendi
Markada ──marka tümünü "Onayla" + "Revizeleri gönder"──▶ Onaylandı
Revize istendi ──yönetici düzeltir──▶ Markada (aynı public link; "Güncellendi" rozeti)
```

- `public_token` yalnızca "Markaya hazır" aşamasından sonra var olur.
- Aynı link yeniden yayında güncellenir; markada "Güncellendi · <zaman>" rozeti çıkar.

---

## 6. Bileşenler

### 6.1 Marka seçme ekranı (ekip)
Girişten sonra ilk ekran. Aktif markaların logo kartları; hover'da yükselme. Seçilen marka üst barda logo + isim + renk ile sabitlenir.

### 6.2 Kaynak alımı (Drive)
- **OAuth modu:** Google Drive API. Klasör listelenir; dosya adından slayt sırası çıkarılır (`... 1`, `... 2` → kaydırmalı sıra); `thumbnailLink` / önizleme URL'leri alınır.
- **Açık link modu:** API anahtarı ile herkese açık klasör listeleme.
- **Manuel mod:** doğrudan görsel deposuna (R2) yükleme.
- Klasör kuralı: `.../POST` → carousel öğeleri, `.../STORY` → story öğeleri, reels linki → reel öğeleri.
- Hata: süresi dolan token → yeniden yetkilendir; erişilemeyen klasör → net mesaj; desteklenmeyen dosya türü → atla + atlananları listele.

### 6.3 AI planlama servisi (sunucu rotası)
- **Girdi:** marka bilgisi + varlık listesi (ad, tür, klasör, sıra, önizleme URL'i) + prompt.
- **Çıktı:** JSON plan — `{ date, type: post|story|reel|special, assetRefs[], caption?, isSpecial?, specialLabel? }` dizisi.
- **Anlar:** açık tarihler, tarih aralıkları, tekrar kuralları ("her gün", "2 günde bir", "hafta içi", "haftada 1"), aynı anda birden çok kural, güne özel gün etiketi.
- **Slot > varlık:** hem "kurala kadar uzat" (boş slotlar, `isGap=true`) hem "içerikte bitir" versiyonu üretir + bayrak → Studio yöneticiye sorar (modal).
- **Model:** Claude (Anthropic API). Anahtar env'de; developer sekmesinden yönetilir. Varsayılan düşük maliyet için Haiku, kaliteli caption için Sonnet — developer seçer.
- **Hata:** geçersiz/aşırı uzun prompt → doğrulama mesajı; API hatası → 1 kez tekrar, sonra caption'sız iskelet plan (yalnız ritim kurallarından).

### 6.4 Plan editörü
Sürükle-bırak ile öğe yeniden sıralama/güne taşıma, caption satır içi düzenleme (post/reel; story = açıklama yok), öğe ekle/sil, tarih değiştir, tema (ana + vurgu renk) canlı önizleme, `isGap` öğelerini Drive'dan/manuel doldurma. Yönetici ve onaylayan kullanır.

### 6.5 İç önizleme
Marka görünümünün aynısı + üstte "İÇ ONAY — markaya gönderilmedi" bandı + altta "Onayla / Yöneticiye geri gönder". Açan kişi adını yazar. Yorum + iğne Studio geri bildirim kutusuna `stage=internal` olarak düşer. Giriş yapmış ekip üyesi için editör aksiyonları da açıktır.

### 6.6 Marka görünümü
1. **Splash (3–4 sn):** tek renk marka rengi arka plan, ortada logo, altında plan başlığı:
   `<MARKA>` / `<başlangıç> – <bitiş> Sosyal Medya Paylaşım Takvimi`. Ardından fade-out → takvim.
   `prefers-reduced-motion` açıksa ~1 sn'ye düşer; tekrar ziyarette kısa (~1 sn) gösterilir (sessionStorage).
2. **İki görünüm, üstte geçiş:**
   - **Izgara (varsayılan):** Instagram feed'i düzeni — 3 sütun, sırayla tüm post/reel; story'ler ayrı şerit. Hücreye tıkla → öğe detayı (caption, yorum, iğne).
   - **Zaman çizelgesi:** tarihli kart dizilimi (tarih rayı + medya + tür rozeti + caption + aksiyonlar).
3. **Öğe aksiyonları:** medya carousel (kaydırmalı sırası), reel için Drive gömülü oynatıcı (tıkla-oynat); görsel üzerine tıkla → numaralı iğne + not; "✓ Onayla / ↺ Revize iste"; öğe yorumu (ilk yorumda ad sorulur, sonra hatırlanır).
4. **En altta "Revizeleri gönder":** yorum/iğne/onaylar anlık kaydedilir; bu buton turu tamamlar, plan durumunu "Revize istendi" ya da "Onaylandı" yapar. Ardından ölçülü onay ekranı:
   > Revizeleriniz ekibe iletildi. En kısa sürede görülmesi için lütfen WhatsApp grubundan kısa bir not bırakın.
5. Marka yalnız kendi markasının takvimini görür; başka marka / aşama / sekme yok.

### 6.7 Instagram feed referansı
- Markaya `instagram_handle` eklenir.
- **Bağlı hesap yolu:** marka Instagram Business/Creator hesabını bir kez bağlar (Instagram Graph API); son 9–12 medya çekilip önbelleğe alınır.
- **Yedek yol:** yönetici mevcut feed'in ekran görüntüsünü yükler.
- Studio'da plan editörünün yanında ızgara olarak gösterilir; isteğe bağlı marka görünümünde de.

---

## 7. Veri modeli (Supabase Postgres)

- **`brands`**: `id`, `name`, `logo_url`, `color_primary`, `color_accent`, `instagram_handle`, `ig_connection` (jsonb / null), `status` (`active` | `archived`), `created_by_name`, `created_at`.
- **`brand_sources`**: `id`, `brand_id`, `kind` (`drive_oauth` | `public_link` | `manual`), `config` (jsonb: klasör id/link vb.).
- **`plans`**: `id`, `brand_id`, `title`, `range_start`, `range_end`, `prompt`, `stage` (`taslak` | `ic_onayda` | `markaya_hazir` | `markada` | `revize_istendi` | `onaylandi`), `theme` (jsonb), `internal_token`, `public_token` (null'dan başlar), `version`, `published_at`, `last_actor_name`, `created_at`.
- **`plan_items`**: `id`, `plan_id`, `date`, `type` (`post` | `story` | `reel` | `special`), `sort`, `caption` (null = story), `special_label`, `media` (jsonb: `[{url, kind, slideOrder}]`), `is_gap` (bool), `hidden` (bool).
- **`comments`**: `id`, `plan_item_id`, `stage` (`internal` | `brand`), `author_name`, `author_role`, `body`, `status` (`none` | `approved` | `changes`), `created_at`.
- **`annotations`**: `id`, `plan_item_id`, `media_index`, `x_pct`, `y_pct`, `note`, `stage`, `author_name`, `created_at`.
- **`activity_log`**: `id`, `plan_id`, `actor_name`, `actor_role`, `action`, `meta` (jsonb), `created_at`.
- **`app_config`**: tekil satır — `team_access_token`, `developer_password_hash`, `anthropic_model`, genel varsayılan tema.

Supabase bedava katman uykusu: Vercel cron ile haftalık ping.

---

## 8. Mimari & barındırma (Seçenek A — onaylandı)

| Katman | Servis | Bedava katman | Rol |
|---|---|---|---|
| Uygulama | Next.js @ Vercel Hobby | 100GB trafik/ay | Tek kod tabanı: `/app/*` (ekip), `/c/[token]` (marka), `/i/[token]` (iç onay), `/api/*` |
| Veritabanı + storage | Supabase Free | 500MB DB, sınırsız auth | Tüm metin/veri; developer şifre hash'i |
| Görsel deposu | Cloudflare R2 Free | 10GB, sıfır egress ücreti | Yayında Drive görselleri + logolar buraya kopyalanır |
| AI | Anthropic API | kullandıkça | Prompt → plan JSON |
| Drive | Google Drive API + OAuth | bedava | Otomatik içe aktarma |
| Video | Google Drive `/preview` iframe | bedava | Marka sayfasında tıkla-oynat |
| Alan adı | opsiyonel | ~1$/ay | `takvim.<ajans>.com` |

**Pratik aylık maliyet: 0.** Büyümede ilk sınır R2 10GB (sonrası ~$0.015/GB/ay); AI kullanımı plan başına birkaç kuruş.

### Ana modüller / sınırlar

- `lib/drive/` — kaynak alımı (3 mod), dosya adı → slayt sırası. Girdi: kaynak config; çıktı: normalize varlık listesi.
- `lib/planner/` — kural ayrıştırıcı (tarih/aralık/ritim/çoklu) + varlık dağıtımı + boşluk tespiti. Saf fonksiyonlar; AI çağrısından ayrı.
- `lib/ai/` — Anthropic çağrısı; planner çıktısını + prompt'u alıp caption'lı JSON döndürür. Şema doğrulaması.
- `lib/storage/` — R2 kopyalama/optimize (görsel), logo yükleme.
- `lib/access/` — ekip token'ı, developer şifre kontrolü, rol çözümleme, `activity_log` yazımı.
- `app/(team)/` — Markalar, Onay kuyruğu, Developer sekmeleri + editör.
- `app/c/[token]/` — marka görünümü (splash, ızgara/zaman çizelgesi, aksiyonlar, revize gönder).
- `app/i/[token]/` — iç önizleme (marka görünümü + onay bandı + aksiyonlar).
- `components/calendar/` — ızgara + zaman çizelgesi + öğe kartı + carousel + reel oynatıcı + iğne katmanı (marka ve iç önizlemede ortak).

---

## 9. Hata yönetimi

- **Drive:** token süresi → yeniden yetkilendir; erişilemeyen klasör → net mesaj; desteklenmeyen dosya → atla + listele.
- **AI:** geçersiz prompt → doğrulama; API hatası → 1 tekrar, sonra caption'sız iskelet.
- **Yayın:** R2 yükleme hatası → tekrar; kısmi yayına izin yok; token çakışması → yeniden üret.
- **Marka görünümü:** medya yüklenmezse → placeholder + "Drive'da aç" linki.
- **Erişim:** geçersiz/eskimiş token → nazik "bu link artık geçerli değil" ekranı.
- **Supabase uykusu:** haftalık cron ping.

---

## 10. Test

- **Birim:** kural ayrıştırıcı (tarih / aralık / "2 günde bir" / çoklu kural / güne özel), dosya adı → slayt sırası, varlık dağıtımı + boşluk tespiti, rol çözümleme.
- **Entegrasyon:** AI rotası (sahte Claude; fixture prompt → beklenen JSON şeması), Drive alımı (sahte API), yayın (sahte R2).
- **E2E (Playwright):** marka ekle → kaynak ekle (manuel) → üret → düzenle → iç onaya gönder → iç önizlemede yorum + iğne + Onayla → markaya gönder → `/c/token` splash → ızgara/zaman çizelgesi geçişi → yorum + iğne + Revize iste → Revizeleri gönder → onay ekranı → Studio'da "Revize istendi" + geri bildirim kutusunda notlar → düzelt → yeniden yayınla → "Güncellendi" rozeti.
- **Manuel:** gerçek Drive OAuth; mobilde gerçek video iframe oynatma; splash süresi ve fade; `prefers-reduced-motion`.

---

## 11. Açık noktalar / riskler

- Instagram Graph API app review süreci uzun olabilir — v1'de "yüklenen ekran görüntüsü" yolu her zaman çalışır durumda tutulur.
- "Sadece isim" ile ekip girişi zayıf kimliktir; ekip adresi gizli tutulmalı, `activity_log` bu yüzden zorunlu. İleride kişisel şifre eklenebilir.
- Drive `/preview` iframe çok büyük videolarda yavaş olabilir; gerekirse ileride R2 + transcode (Seçenek A zaten buna hazır).
