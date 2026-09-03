import Link from "next/link";
import { aiProvider } from "@/lib/ai";

export const metadata = { title: "Rehber · Osiris Social Calendar" };

const AI_LABEL: Record<string, string> = {
  openai: "canlı (OpenAI)",
  anthropic: "canlı (Anthropic)",
  mock: "MockAI — sahte çıktı",
};

function Dot({ ok }: { ok: boolean | "warn" }) {
  const c = ok === true ? "var(--ok)" : ok === "warn" ? "var(--warn)" : "var(--text-mute)";
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[12px] font-bold text-[var(--brand)]">
        {n}
      </span>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <div className="mt-1 flex flex-col gap-1 text-[13px] text-[var(--text-dim)]">{children}</div>
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-0 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[15px] font-semibold">
        {title}
        <span className="text-[var(--text-mute)] transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="border-t border-[var(--border)] px-5 py-4">{children}</div>
    </details>
  );
}

export default function RehberPage() {
  const ai = aiProvider();
  const driveOn = !!process.env.GOOGLE_API_KEY;
  const cronOn = !!process.env.CRON_SECRET;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Rehber</h1>
        <p className="mt-1 text-[13px] text-[var(--text-mute)]">
          Sadece ekip görür. Marka bu sayfayı ya da <code className="font-mono">/app</code> bölümünü
          göremez — markaya yalnızca <code className="font-mono">/c/…</code> linki gider.
        </p>
      </div>

      {/* --- durum panosu --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ok)]">
            ✅ Çalışıyor
          </h2>
          <ul className="flex flex-col gap-1.5 text-[13px] text-[var(--text-dim)]">
            <li>Marka ekle / düzenle / arşivle, logo & favicon</li>
            <li>Rol kapısı: yönetici · onaylayan · developer</li>
            <li>İçerik yükleme (post / story / reels), ilerleme %</li>
            <li>Reels placeholder (“video sonra gelecek”)</li>
            <li>Kural tabanlı takvim üretimi + boşluk modalı</li>
            <li>Caption AI yeniden yazma, sürüm geçmişi + fark</li>
            <li>İç onay → markaya link → yorum + iğne + revize</li>
            <li>Revize son tarihi, onay kuyruğu (sil / onayla)</li>
            <li>Yayın takibi: “Yayına al” → tik → “Tamamlandı”</li>
            <li>
              WhatsApp: <code className="font-mono">wa.me</code> ön-dolu link
            </li>
            <li className="flex items-center gap-2">
              <Dot ok={ai !== "mock"} /> AI: {AI_LABEL[ai]}
            </li>
            <li className="flex items-center gap-2">
              <Dot ok={cronOn} /> Otomatik dosya temizliği (14 gün){cronOn ? "" : " — CRON_SECRET yok"}
            </li>
          </ul>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--warn)]">
            ⚠️ Kısıtlı / dikkat
          </h2>
          <ul className="flex flex-col gap-1.5 text-[13px] text-[var(--text-dim)]">
            <li className="flex items-center gap-2">
              <Dot ok={driveOn ? true : "warn"} /> Drive’dan çek:{" "}
              {driveOn ? "açık — klasör “linki olan herkes”e açık olmalı" : "kapalı (GOOGLE_API_KEY yok)"}
            </li>
            <li>
              <b>Instagram “otomatik çek”</b> sunucudan sık başarısız olur. Asıl yol: “Instagram’ı
              Aç” + feed ekran görüntüsü yükleme.
            </li>
            <li>
              <b>MP4 olmayan video</b> (MOV/AVI…) marka görünümünde oynamaz — “MP4 değil” uyarısı
              çıkar. H.264 MP4 yükleyin.
            </li>
            <li>
              <b>Otomatik deploy kapalı.</b> Her güncelleme Vercel’den elle “Create Deployment → main”.
            </li>
            <li>Tek ekip kodu + isim ile giriş (gerçek hesap sistemi yok).</li>
          </ul>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
            🔜 Sonra (Phase 3)
          </h2>
          <ul className="flex flex-col gap-1.5 text-[13px] text-[var(--text-dim)]">
            <li>Özel (paylaşımsız) Drive klasörleri için Google OAuth</li>
            <li>Canlı Instagram Graph API (Meta App Review)</li>
            <li>Ücretli video transcode/hosting — MOV→MP4, adaptif akış</li>
            <li>WhatsApp Business API — mesajı otomatik göndermek</li>
            <li>Public link + API’lerde rate limit</li>
          </ul>
        </div>
      </div>

      {/* --- adım adım --- */}
      <h2 className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
        Adım adım — bir marka için baştan sona
      </h2>

      <Section title="1 · Marka oluştur">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="Markalar → “＋ Marka ekle”">
            <p>
              <Link href="/app/brands" className="text-[var(--brand)] underline">
                Markalar
              </Link>{" "}
              sayfasında sağ üstteki <b>＋ Marka ekle</b>.
            </p>
          </Step>
          <Step n={2} title="Bilgileri gir">
            <p>Marka adı · logo (dosya seç ya da URL) · ana renk & vurgu · (opsiyonel) Instagram kullanıcı adı.</p>
          </Step>
          <Step n={3} title="“Ekle” → marka kartına tıkla">
            <p>Kart açılır; buradan ayarları değiştirebilir, plan oluşturabilirsin.</p>
          </Step>
        </ol>
      </Section>

      <Section title="2 · (Opsiyonel) Instagram & Drive bağla">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="Telefon (WhatsApp)">
            <p>
              Marka ayarlarında <b>Telefon</b> alanına markanın numarasını gir → sonra “WhatsApp’tan
              markaya yolla” düğmesi doğrudan o numarayı açar.
            </p>
          </Step>
          <Step n={2} title="Drive klasör linki">
            <p>
              Marka ayarlarında <b>Google Drive klasör linki</b> → klasör “bağlantısı olan herkes”e
              açık olmalı → <b>Klasörü kaydet</b>. {driveOn ? "" : "(Şu an GOOGLE_API_KEY yok, bu özellik kapalı.)"}
            </p>
          </Step>
          <Step n={3} title="Instagram feed">
            <p>
              Plan editöründe sağdaki <b>Mevcut feed</b> panelinde: <b>Instagram’ı Aç</b> (gerçek
              profil) veya <b>Feed’i otomatik çek</b> (çoğu zaman başarısız → altta ekran görüntüsü
              yükle). Yüklenen kare AI analizine girer, notlar sonraki üretimde caption’lara katılır.
            </p>
          </Step>
        </ol>
      </Section>

      <Section title="3 · Yeni plan">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="Marka kartında “Yeni plan”">
            <p>Başlık · başlangıç–bitiş tarihi · kural metni.</p>
          </Step>
          <Step n={2} title="Kural metnini yaz">
            <p className="rounded-lg bg-[var(--bg)] p-2 font-mono text-[12px]">
              01–12 Eylül: 2 günde bir post, her gün story, haftada 1 reels. 7 Eylül’e özel post.
              Story’lere açıklama yazma.
            </p>
          </Step>
          <Step n={3} title="“Oluştur”">
            <p>Plan editörü açılır, aşaması <b>Taslak</b>.</p>
          </Step>
        </ol>
      </Section>

      <Section title="4 · İçerik yükle (Taslak aşamasında)">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="Post / Story / Reels kutularına dosya bırak">
            <p>“kaydırmalı 1 / 2” isimli dosyalar tek bir carousel olur. İlerleme yüzdesi görünür.</p>
          </Step>
          <Step n={2} title="Drive’dan çek (varsa)">
            <p>
              Marka Drive klasörü bağlıysa <b>Drive’dan çek</b> düğmesi tüm görsel/videoları çeker
              (“X yeni · Y zaten vardı”).
            </p>
          </Step>
          <Step n={3} title="Reels hazır değilse">
            <p>
              <b>＋ Placeholder (video sonra gelecek)</b> → markaya “hazırlanıyor” olarak görünür.
            </p>
          </Step>
          <Step n={4} title="Video ipucu">
            <p>H.264 <b>MP4</b> yükle. MOV/AVI’de “MP4 değil” uyarısı çıkar ve marka tarafında oynamaz.</p>
          </Step>
        </ol>
      </Section>

      <Section title="5 · Takvimi üret">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="“Takvimi üret”">
            <p>Kurallar çözülür, görseller dağıtılır, caption’lar yazılır (tek AI çağrısı).</p>
          </Step>
          <Step n={2} title="Boşluk modalı çıkarsa">
            <p>
              <b>Kurala kadar uzat</b> (placeholder’larla doldur) ya da <b>İçerik biterse dur</b>.
            </p>
          </Step>
          <Step n={3} title="Düzenle">
            <p>
              Satırları sırala, caption’ı elle ya da <b>AI ile yeniden yaz</b>, temayı değiştir. Her
              üretim sürüm geçmişine düşer.
            </p>
          </Step>
        </ol>
      </Section>

      <Section title="6 · İç onay">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="“İç onaya gönder”">
            <p>
              <code className="font-mono">/i/…</code> linki oluşur. <b>WhatsApp’tan ekibe</b> düğmesi
              ile onaylayana yolla.
            </p>
          </Step>
          <Step n={2} title="Onaylayan açar (isim girer, şifre yok)">
            <p>Marka ile aynı arayüz: öğe yorumu + görsele iğne. Sonunda <b>Onayla</b>.</p>
          </Step>
          <Step n={3} title="Onaylandı → markaya hazır">
            <p>
              Editörde <code className="font-mono">/c/…</code> marka linki belirir.
            </p>
          </Step>
        </ol>
      </Section>

      <Section title="7 · Markaya gönder">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="“WhatsApp’tan markaya” düğmesi">
            <p>
              Mesaj + <code className="font-mono">/c/…</code> linki yazılı halde WhatsApp açılır — sen
              “gönder”e basarsın. Marka linki tıklar; uygulama kurmaz, giriş yapmaz.
            </p>
          </Step>
          <Step n={2} title="Marka: animasyonlu açılış → grid / zaman çizelgesi">
            <p>Video oynar, görsele iğne + öğe yorumu bırakır, <b>Revizeleri gönder</b>.</p>
          </Step>
          <Step n={3} title="Revize son tarihi (opsiyonel)">
            <p>Editörde tarih koy → markada ve onay kuyruğunda “⏰ süre doldu” rozeti çıkar.</p>
          </Step>
        </ol>
      </Section>

      <Section title="8 · Revize turu">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="Gelen notlar sağdaki “Geri bildirim” kutusunda">
            <p>Öğeye git, düzelt, gerekiyorsa yeniden üret.</p>
          </Step>
          <Step n={2} title="Tekrar markaya">
            <p>Marka görünümünde “Güncellendi” rozeti + <b>Neler değişti?</b> ile sürüm farkı görünür.</p>
          </Step>
          <Step n={3} title="Marka onaylayınca → “Onaylandı”">
            <p>Onay kuyruğunda ✓ tik.</p>
          </Step>
        </ol>
      </Section>

      <Section title="9 · Yayın takibi">
        <ol className="flex flex-col gap-3">
          <Step n={1} title="“Yayına al” (Onaylandı aşamasında)">
            <p>
              Plan <b>Yayında</b> olur. Editörde <b>Yayın takibi</b> paneli açılır.
            </p>
          </Step>
          <Step n={2} title="Her paylaşımı yaptıkça “Yayınlandı” işaretle">
            <p>Progress bar dolar; onay kuyruğunda ve marka görünümünde “12 / 20 paylaşıldı” görünür.</p>
          </Step>
          <Step n={3} title="Hepsi bitince otomatik “Tamamlandı ✓”">
            <p>
              Yanlışlıkla aldıysan <b>Yayını geri al</b> ile <b>Onaylandı</b>’ya döner (tikler temizlenir).
            </p>
          </Step>
        </ol>
      </Section>

      {/* --- sorun giderme --- */}
      <h2 className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
        Sık sorunlar
      </h2>
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 text-[13px] text-[var(--text-dim)]">
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="font-semibold text-[var(--text)]">Caption’lar tuhaf / şablon gibi</dt>
            <dd>
              AI “MockAI” modunda. Vercel’de <code className="font-mono">OPENAI_API_KEY</code>{" "}
              (ya da <code className="font-mono">ANTHROPIC_API_KEY</code>) ekli mi? Developer sekmesi
              gösterir.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text)]">“Feed’i otomatik çek” hep başarısız</dt>
            <dd>Beklenen. “Instagram’ı Aç” ile bakıp ekran görüntüsü yükle, analiz onunla çalışır.</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text)]">Reels marka tarafında oynamıyor</dt>
            <dd>Dosya MP4 (H.264) değil. Dışa aktarırken formatı değiştir, yeniden yükle.</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text)]">“Drive’dan çek” görünmüyor</dt>
            <dd>
              Ya <code className="font-mono">GOOGLE_API_KEY</code> yok, ya da markaya Drive klasörü
              bağlanmamış.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text)]">Değişiklikler canlıda görünmüyor</dt>
            <dd>Vercel → Deployments → “Create Deployment → main” elle çalıştır.</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--text)]">“yazma çakışması” hatası</dt>
            <dd>Aynı anda çok kişi kaydetti. Birkaç saniye sonra tekrar dene.</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
