import Image from "next/image";

export const metadata = { title: "Rehber · Osiris Social Calendar" };

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="mt-3 overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)]">
      <Image
        src={`/rehber/${src}.png`}
        alt={alt}
        width={1280}
        height={820}
        className="h-auto w-full"
        sizes="(max-width: 780px) 100vw, 720px"
      />
      <figcaption className="border-t border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-mute)]">
        {alt}
      </figcaption>
    </figure>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[13px] font-bold text-[var(--brand)]">
          {n}
        </span>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <div className="mt-1 flex flex-col gap-1.5 text-[13.5px] leading-relaxed text-[var(--text-dim)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RehberPage() {
  return (
    <div className="flex max-w-[780px] flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Rehber</h1>
        <p className="mt-1 text-[13px] text-[var(--text-mute)]">
          Bu sayfa yalnızca ekibe görünür. Marka ne bu sayfayı ne de <code className="font-mono">/app</code>{" "}
          bölümünü görür — markaya sadece <code className="font-mono">/c/…</code> linki gider.
        </p>
        <div className="mt-3 flex gap-2 text-[13px]">
          <a href="#yonetici" className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 font-semibold text-[var(--brand)]">
            Yönetici için
          </a>
          <a href="#onaylayan" className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 font-semibold text-[var(--brand)]">
            İç onaylayan için
          </a>
        </div>
      </div>

      {/* ================= YÖNETİCİ ================= */}
      <section id="yonetici" className="flex flex-col gap-3 scroll-mt-20">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-mute)]">
          Yönetici · bir markayı baştan sona yürütmek
        </h2>

        <Step n={1} title="Marka ekle">
          <p>
            <b>Markalar</b> sayfasında sağ üstteki <b>＋ Marka ekle</b>.
          </p>
          <p>Açılan pencerede marka adı, logo (dosya seç ya da URL), ana renk & vurgu, Instagram kullanıcı adı → <b>Ekle</b>.</p>
          <Shot src="y1-markalar" alt="Markalar sayfası — sağ üstte “＋ Marka ekle”" />
          <Shot src="y2-marka-ekle" alt="Yeni marka penceresi" />
        </Step>

        <Step n={2} title="Marka ayarları">
          <p>
            Marka kartına tıkla. <b>Telefon (WhatsApp)</b> girersen sonra “WhatsApp’tan markaya”
            düğmesi doğrudan bu numarayı açar. Logo, renkler ve Instagram kullanıcı adı da buradan.
          </p>
          <p className="text-[var(--text-mute)]">
            Not: Drive klasörü marka ayarı değil — her çekimin kendi klasörü olduğu için{" "}
            <b>plan oluştururken</b> girilir (adım 3).
          </p>
          <Shot src="y3-marka-ayar" alt="Marka ayarları — telefon, logo, renkler" />
        </Step>

        <Step n={3} title="Yeni plan">
          <p>
            Marka sayfasında <b>Yeni plan</b> → başlık, başlangıç–bitiş tarihi, kural metni ve{" "}
            <b>bu çekimin Google Drive klasör linki</b> (opsiyonel).
          </p>
          <p className="rounded-lg bg-[var(--bg)] p-2 font-mono text-[12px] text-[var(--text-dim)]">
            1–14 Eylül: 2 günde bir post, her gün story, haftada 1 reels. 7 Eylül’e özel post.
            Story’lere açıklama yazma.
          </p>
          <p>
            Drive linki her çekimde değişir. Klasör “bağlantısı olan herkes”e açık olmalı; içi şöyle
            olmalı:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-[var(--bg)] p-2 text-[11.5px] leading-5 text-[var(--text-dim)]">{`ERÇİ 3 - Boyutlandırılmış/   ← plan linki bunu gösterir
  POST/
    <tekli post görselleri>
    KAYDIRMALI 1/   → tek bir carousel
    KAYDIRMALI 2/
  STORY/
  REELS/          ← video dosyaları
  CROP/           → atlanır (dekupeler)
  ERÇİ EK/        → içine girilir, orada da POST/STORY/REELS`}</pre>
          <Shot src="y4-yeni-plan" alt="Yeni plan formu — Drive klasör linki alanı" />
        </Step>

        <Step n={4} title="İçerik yükle veya Drive’dan çek">
          <p>
            Plan <b>Taslak</b> aşamasındayken:
          </p>
          <p>
            • <b>Drive’dan çek</b> — plana girdiğin klasörü tarar; POST/STORY/REELS (ve “… EK”) alt
            klasörlerindeki her şeyi tipiyle içeri alır, CROP’u atlar, “KAYDIRMALI N” klasörlerini
            carousel yapar. Linki buradan da değiştirebilirsin.
          </p>
          <p>• Elle: Post / Story / Reels kutularına dosya bırak.</p>
          <p>• Reels henüz hazır değilse <b>＋ Placeholder</b> — markaya “hazırlanıyor” görünür.</p>
          <p>• Video: <b>MP4 (H.264)</b> yükle. MOV/AVI’de “MP4 değil” uyarısı çıkar, marka tarafında oynamaz.</p>
          <Shot src="y5-icerik-yukle" alt="Editör — İçerik bölümü, Drive klasör linki + “Drive’dan çek”" />
        </Step>

        <Step n={5} title="Takvimi üret">
          <p>
            <b>Takvimi üret</b>. İçerik kuralı tam karşılamıyorsa bir pencere çıkar:{" "}
            <b>Kurala kadar uzat</b> (eksik günleri placeholder’la doldur) ya da{" "}
            <b>İçerik biterse dur</b>.
          </p>
          <Shot src="y6-uret" alt="Üretim — boşluk penceresi" />
        </Step>

        <Step n={6} title="Düzenle">
          <p>
            Satırları <b>↑ ↓</b> ile sırala, tarihi değiştir, caption’ı elle yaz ya da{" "}
            <b>Yeniden yaz</b> ile AI’a kısalttır / tonunu değiştirt. Her üretim{" "}
            <b>Sürüm geçmişi</b>’ne kaydolur, aralarındaki farkı görebilirsin.
          </p>
          <Shot src="y7-takvim" alt="Üretilen takvim — satırlar, caption, “Yeniden yaz”" />
        </Step>

        <Step n={7} title="İç onaya gönder">
          <p>
            <b>İç onaya gönder</b> → <code className="font-mono">/i/…</code> linki oluşur.{" "}
            <b>WhatsApp’tan ekibe</b> ile onaylayana yolla. İstersen{" "}
            <b>Marka için revize son tarihi</b> koy — süre dolunca kuyrukta “⏰” rozeti çıkar.
          </p>
          <Shot src="y8-ic-onaya-gonder" alt="İç önizleme linki + “WhatsApp’tan ekibe”" />
        </Step>

        <Step n={8} title="Revize geldiğinde">
          <p>
            Onaylayan not bırakırsa sağdaki <b>Geri bildirim</b> kutusunda görürsün. İlgili satırı
            düzelt, gerekirse yeniden üret. Sonraki turda marka tarafında “Güncellendi” rozeti ve{" "}
            <b>Neler değişti?</b> farkı çıkar.
          </p>
          <Shot src="y9-geri-bildirim" alt="Editör — “Geri bildirim” kutusu" />
        </Step>

        <Step n={9} title="Markaya gönder">
          <p>
            Onaylayan <b>Onayla</b> deyince marka linki (<code className="font-mono">/c/…</code>)
            belirir. <b>WhatsApp’tan markaya</b> → mesaj + link yazılı halde WhatsApp açılır, sen{" "}
            <b>gönder</b>’e basarsın. Marka linki tıklar; uygulama kurmaz, giriş yapmaz.
          </p>
        </Step>

        <Step n={10} title="Yayına al ve takip et">
          <p>
            Marka onaylayınca aşama <b>Onaylandı</b> olur. <b>Yayına al</b> → <b>Yayında</b>.
          </p>
          <p>
            Her paylaşımı yaptıkça kutucuğu işaretle; ilerleme çubuğu dolar (marka da “12 / 20
            paylaşıldı”yı görür). Hepsi bitince otomatik <b>Tamamlandı</b>. Yanlışlıkla başlattıysan{" "}
            <b>Yayını geri al</b>.
          </p>
          <Shot src="y10-yayina-al" alt="Onaylandı aşaması — “Yayına al”" />
          <Shot src="y11-yayin-takibi" alt="Yayın takibi paneli + ilerleme çubuğu" />
        </Step>
      </section>

      {/* ================= İÇ ONAYLAYAN ================= */}
      <section id="onaylayan" className="flex flex-col gap-3 scroll-mt-20">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-mute)]">
          İç onaylayan · marka görmeden önceki kontrol
        </h2>

        <Step n={1} title="Linki aç">
          <p>
            Yöneticiden gelen <code className="font-mono">/i/…</code> linkini aç. Adını gir — şifre
            yok. Üstteki turuncu şerit “İç onay — markaya gönderilmedi” der; yani buradaki hiçbir şey
            markaya gitmez.
          </p>
          <Shot src="o1-link-ac" alt="İç onay linki — isim girişi" />
        </Step>

        <Step n={2} title="İncele">
          <p>
            <b>Izgara</b> veya <b>Zaman çizelgesi</b> görünümü. Videolar oynar. Bir görsele tıklayıp{" "}
            <b>iğne</b> (nokta) bırakabilir, her öğeye <b>yorum</b> yazabilirsin — marka arayüzüyle
            aynı.
          </p>
          <Shot src="o2-inceleme" alt="İnceleme — ızgara görünümü, alt eylem çubuğu" />
        </Step>

        <Step n={3} title="Onayla ya da geri gönder">
          <p>
            Her kartta <b>✓ Onayla</b> / <b>↺ Revize iste</b>. Değişiklik gerekiyorsa alttaki{" "}
            <b>geri gönderme notu</b>na yaz ve <b>Yöneticiye geri gönder</b> — plan yöneticiye{" "}
            <b>Taslak</b> olarak döner, notun “Geri bildirim” kutusunda görünür.
          </p>
          <p>
            Her şey uygunsa alttaki <b>Onayla</b> → plan <b>markaya hazır</b> hale gelir ve yöneticide
            marka linki belirir.
          </p>
          <Shot src="o3-onayla" alt="Kart üzerinde “✓ Onayla / ↺ Revize iste”" />
          <Shot src="o4-geri-gonder" alt="Alt çubuk — not + “Yöneticiye geri gönder”" />
        </Step>
      </section>

      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-[13px] text-[var(--text-dim)]">
        <b className="text-[var(--text)]">Marka ne görür?</b> Sadece <code className="font-mono">/c/…</code>{" "}
        linki: marka renginde animasyonlu açılış, ızgara + zaman çizelgesi, oynatılabilir videolar,
        öğe yorumu + iğne, ve <b>Revizeleri gönder</b> düğmesi. Bu rehberi, diğer markaları ve{" "}
        <code className="font-mono">/app</code> bölümünü göremez.
      </div>
    </div>
  );
}
