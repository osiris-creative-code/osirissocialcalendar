import { readFileSync, writeFileSync } from "node:fs";

const WEB = "/private/tmp/claude-501/-Users-deralist-Desktop-WebApps--Bots--Apps-and-AI-Social-Media-Planning-And-Calendar/76ce6d48-9519-4b31-945d-ce20cdfcd82d/scratchpad/shots/web";
const OUT = "/private/tmp/claude-501/-Users-deralist-Desktop-WebApps--Bots--Apps-and-AI-Social-Media-Planning-And-Calendar/76ce6d48-9519-4b31-945d-ce20cdfcd82d/scratchpad/ritim-tutorial.html";

const img = (name) =>
  `data:image/jpeg;base64,${readFileSync(`${WEB}/${name}.jpg`).toString("base64")}`;

const tracks = [
  {
    id: "yonetici",
    label: "Yönetici",
    blurb: "Planı kuran ve düzenleyen kişi. Drive linklerinden + bir promptdan takvimi üretir, düzenler, iç onaya yollar.",
    steps: [
      ["Ekip kapısı", "01-gate-team",
        "Uygulama tek bir ekip adresinin arkasında. İlk açılışta ekip kodu istenir — takımın paylaştığı gizli kod (<code>osiris-dev</code>). Kişisel şifre yok."],
      ["İsim ve rol", "02-gate-role",
        "Adını yaz, rolünü seç: <b>Yönetici</b> ya da <b>In-house onaylayan</b>. Yönetici ve onaylayan şifre girmez — kim ne yaptı, bıraktığı isimle iz kaydına yazılır. Developer ayrıca şifreyle girer."],
      ["Markalar", "03-brands",
        "Kayıtlı markalar kart olarak durur; üzerine gelince hafifçe yükselir. <b>＋ Marka ekle</b> ile yeni marka: ad, logo, iki renk, Instagram kullanıcı adı. Bu bilgiler o markanın tüm çıktılarında kullanılır."],
      ["Marka ayarları", "04-brand-detail",
        "Bir markaya girince logo, ana renk, vurgu rengi ve Instagram kullanıcı adını düzenleyebilirsin. Altta o markaya ait planlar listelenir. <b>Yeni plan</b> ile başlarsın."],
      ["Yeni plan", "05-new-plan",
        "Başlık, tarih aralığı ve içerik kaynağını (Google Drive bağlı / açık link / manuel) seçersin. Sonra <b>prompt</b>'u yazarsın — kural tabanlıdır: “1–12 Eylül arası 2 günde bir post, her gün story, haftada 1 reels, 7 Eylül'e özel post”."],
      ["Editör", "06-editor-empty",
        "Plan açıldığında editör boştur. <b>Takvimi üret</b> promptu ve Drive içeriğini AI'ya verir; kuralları çözer, görselleri günlere dağıtır, her post/reel için açıklama taslağı yazar."],
      ["İçerik yetmiyorsa", "07-gap-modal",
        "Kural, Drive'daki içerikten fazla slot isterse sana sorulur: <b>Kurala kadar uzat</b> (boş slotlar bırakılır, sonra sen doldurursun; markaya gösterilmez) ya da <b>İçerikte bitir</b> (plan dolu öğeyle biter)."],
      ["Üretilen taslak", "08-editor-filled",
        "Her satır bir paylaşım: tür, tarih, küçük görsel, AI açıklaması (story'de yok — sadece tarih). Sürükle-sırala için ↑↓, kaldırmak için ×, açıklamayı tıklayıp düzenle, tema renklerini ayarla. Sağda markanın mevcut Instagram feed'i referansı ve gelen yorumların kutusu var."],
      ["İç onaya gönder", "09-editor-internal-link",
        "Hazır olunca <b>İç onaya gönder</b>. Plan “İç onayda” aşamasına geçer ve tahmin edilemez bir <b>iç önizleme linki</b> üretilir. Bu linki ekip içinde paylaşırsın — marka linki henüz yoktur."],
      ["Onay kuyruğu", "21-queue",
        "Üstteki <b>Onay kuyruğu</b> sekmesi tüm planları aşamasına göre gruplar; “İç onayda” olanlar öne çıkar. Buradan doğrudan editöre geçebilirsin."],
    ],
  },
  {
    id: "onaylayan",
    label: "İç onaylayan",
    blurb: "Plan markaya gitmeden önce kontrol eden kişi. Kendi iç önizleme linkinden bakar, not bırakır, onaylar ya da geri gönderir.",
    steps: [
      ["İç önizleme", "10-internal-top",
        "Yöneticiden gelen <code>/i/…</code> linkini açarsın. Üstte turuncu bir bant: <b>İÇ ONAY — markaya gönderilmedi</b>. Altında markanın göreceğinin birebir aynısı: ızgara / zaman çizelgesi geçişi, story akışı, paylaşım kartları."],
      ["İnceleme", "11-internal-cards",
        "Her paylaşımın altına yorum yazabilir, görselin üstünde bir noktaya <b>iğneli not</b> bırakabilirsin. Videolar “Drive oynatıcı” etiketiyle açılır. Açan kişi sadece adını yazar; yorumlar yöneticinin geri bildirim kutusuna “İç” etiketiyle düşer."],
      ["Onay ya da geri gönder", "12-internal-approved",
        "<b>Onayla</b> dediğinde plan “Markada” aşamasına geçer ve marka linki (<code>/c/…</code>) üretilip ekrana gelir — bu linki markaya iletebilirsin. <b>Yöneticiye geri gönder</b> ise bir not ile planı taslağa döndürür."],
    ],
  },
  {
    id: "marka",
    label: "Marka",
    blurb: "Sadece bir link. Hiçbir uygulama yok, giriş yok. Marka takvimi açar, videoları oynatır, revize yazar, tek tuşla gönderir.",
    steps: [
      ["Açılış", "14-brand-splash",
        "WhatsApp'tan gelen link herhangi bir tarayıcıda açılır. 3–4 saniyeliğine marka renginde bir açılış ekranı: logo ve “28 Ağustos – 11 Eylül Sosyal Medya Paylaşım Takvimi”. Sonra yumuşakça kaybolur, takvim gelir."],
      ["Izgara görünümü", "15-brand-grid",
        "Varsayılan görünüm Instagram feed'i gibi: story'ler üstte ayrı bir şerit, post ve reels ızgarada. Videoya dokununca oynar (gerçek sürümde Drive videosu gömülü). “Güncellendi” rozeti planın yenilendiğini gösterir."],
      ["İğneli not", "17-brand-pin-note",
        "Bir görselde tam olarak nerede değişiklik istiyorsa oraya dokunur ve “Bu noktada ne değişsin?” kutusuna yazar — numaralı bir iğne bırakılır. Her paylaşımın altında ayrıca serbest yorum ve “Onayla / Revize iste” düğmeleri var."],
      ["İsim", "13-brand-name-prompt",
        "Marka ilk kez yorum ya da not bıraktığında yalnızca “Adınız” sorulur; sonrası için tarayıcıda hatırlanır. Şifre, üyelik, uygulama yok."],
      ["Zaman çizelgesi", "19-brand-timeline",
        "Üstteki geçişle aynı içerik tarih tarih dizilir. Marka hangi görünümü seçtiyse bir sonraki açılışta o gelir; açılış ekranı da ikinci ziyarette kısalır."],
      ["Revizeleri gönder", "20-brand-confirm",
        "Yazılan her şey anlık kaydedilir; alttaki <b>Revizeleri gönder</b> turu tamamlar. Ardından ölçülü bir onay: <i>“Revizeleriniz ekibe iletildi. En kısa sürede görülmesi için lütfen WhatsApp grubundan kısa bir not bırakın.”</i>"],
    ],
  },
];

const stepHtml = (steps) =>
  steps
    .map(
      ([title, shot, body], i) => `
      <article class="step reveal">
        <div class="step-index">${String(i + 1).padStart(2, "0")}</div>
        <div class="step-body">
          <h3>${title}</h3>
          <p>${body}</p>
          <figure><img loading="lazy" src="${img(shot)}" alt="${title}" /></figure>
        </div>
      </article>`,
    )
    .join("");

const panels = tracks
  .map(
    (t, i) => `
    <section class="panel${i === 0 ? " active" : ""}" id="panel-${t.id}" role="tabpanel" aria-labelledby="tab-${t.id}"${i === 0 ? "" : " hidden"}>
      <p class="panel-blurb">${t.blurb}</p>
      ${stepHtml(t.steps)}
    </section>`,
  )
  .join("");

const tabs = tracks
  .map(
    (t, i) =>
      `<button role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}" data-target="${t.id}">${t.label}</button>`,
  )
  .join("");

const html = `<title>Ritim Kullanım Kılavuzu</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" />
<style>
  *,*::before,*::after{box-sizing:border-box}
  :root{
    --bg:#fbf7f0; --surface:#ffffff; --surface-2:#f4eee5;
    --border:#e7dfd2; --border-strong:#d8ccba;
    --text:#241e1a; --dim:#6e645a; --mute:#978c7e;
    --crust:#7a4a2b; --crust-soft:#f0e4d8;
    --jam:#b23048; --gold:#c07d1f;
    --shadow:0 1px 2px rgba(40,28,18,.05),0 18px 44px -22px rgba(40,28,18,.28);
    --maxw:900px;
  }
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
    --bg:#1b1714; --surface:#241e18; --surface-2:#2d261f;
    --border:#3a3128; --border-strong:#4a3f32;
    --text:#f3ece2; --dim:#b4a797; --mute:#897d6f;
    --crust:#ce9067; --crust-soft:#38291f;
    --jam:#e27189; --gold:#e3a94a;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 22px 50px -24px rgba(0,0,0,.65);
  }}
  :root[data-theme="dark"]{
    --bg:#1b1714; --surface:#241e18; --surface-2:#2d261f;
    --border:#3a3128; --border-strong:#4a3f32;
    --text:#f3ece2; --dim:#b4a797; --mute:#897d6f;
    --crust:#ce9067; --crust-soft:#38291f;
    --jam:#e27189; --gold:#e3a94a;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 22px 50px -24px rgba(0,0,0,.65);
  }
  body{margin:0;background:var(--bg);color:var(--text);
    font-family:"Figtree",ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.6;
    -webkit-font-smoothing:antialiased}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
  a{color:var(--crust)}
  code{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.86em;
    background:var(--surface-2);border:1px solid var(--border);border-radius:5px;padding:1px 5px}

  header.hero{padding:72px 0 40px}
  .kicker{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.18em;
    text-transform:uppercase;color:var(--mute)}
  h1{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:clamp(30px,5.5vw,46px);
    letter-spacing:-.02em;margin:.35em 0 .3em;text-wrap:balance}
  .lede{font-size:18px;color:var(--dim);max-width:64ch}

  .flow{display:flex;flex-wrap:wrap;gap:8px;margin:28px 0 6px}
  .flow span{font-family:"IBM Plex Mono",monospace;font-size:12px;padding:6px 11px;border-radius:999px;
    background:var(--surface);border:1px solid var(--border);color:var(--dim)}
  .flow span::after{content:"→";margin-left:10px;color:var(--mute)}
  .flow span:last-child::after{content:""}

  .roles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:34px 0 8px}
  .roles div{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 16px 18px}
  .roles h4{font-family:"Fraunces",serif;font-weight:600;margin:0 0 4px;font-size:16px}
  .roles p{margin:0;font-size:13.5px;color:var(--dim)}
  @media (max-width:680px){.roles{grid-template-columns:1fr}}

  .tabs{position:sticky;top:0;z-index:20;display:flex;gap:6px;padding:14px 0;
    background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);
    border-bottom:1px solid var(--border);margin-top:40px}
  .tabs button{font:inherit;font-weight:600;font-size:14px;cursor:pointer;
    border:1px solid var(--border);background:var(--surface);color:var(--dim);
    padding:8px 16px;border-radius:999px;transition:all .16s ease}
  .tabs button[aria-selected="true"]{background:var(--crust);color:#fff;border-color:transparent}

  .panel{padding:36px 0 20px}
  .panel[hidden]{display:none}
  .panel-blurb{font-size:16px;color:var(--dim);max-width:62ch;margin:0 0 34px;
    padding-left:16px;border-left:3px solid var(--crust-soft)}

  .step{display:grid;grid-template-columns:52px 1fr;gap:18px;margin-bottom:44px}
  .step-index{font-family:"Fraunces",serif;font-size:22px;font-weight:600;color:var(--gold);
    text-align:right;padding-top:2px;font-variant-numeric:tabular-nums}
  .step-body h3{font-family:"Fraunces",serif;font-weight:600;font-size:21px;margin:0 0 .3em;letter-spacing:-.01em}
  .step-body p{margin:0 0 16px;color:var(--dim);max-width:60ch}
  figure{margin:0;border:1px solid var(--border);border-radius:14px;overflow:hidden;
    box-shadow:var(--shadow);background:var(--surface-2)}
  figure img{display:block;width:100%;height:auto;cursor:zoom-in}
  @media (max-width:640px){
    .step{grid-template-columns:1fr;gap:8px}
    .step-index{text-align:left}
  }

  .reveal{opacity:0;transform:translateY(14px)}
  .reveal.in{opacity:1;transform:none;transition:opacity .55s ease,transform .55s ease}
  @media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none}}

  footer{padding:30px 0 90px;color:var(--mute);font-size:13px;border-top:1px solid var(--border);margin-top:20px}

  .lightbox{position:fixed;inset:0;z-index:60;background:rgba(20,14,10,.82);
    display:none;place-items:center;padding:24px;cursor:zoom-out}
  .lightbox.on{display:grid}
  .lightbox img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)}

  .themetoggle{position:fixed;right:16px;bottom:16px;z-index:40;width:40px;height:40px;border-radius:50%;
    border:1px solid var(--border);background:var(--surface);color:var(--dim);cursor:pointer;font-size:16px}
</style>

<button class="themetoggle" id="themetoggle" aria-label="Tema">◐</button>

<div class="wrap">
  <header class="hero">
    <div class="kicker">Kullanım Kılavuzu</div>
    <h1>Ritim nasıl çalışır</h1>
    <p class="lede">Ritim, bir metin promptu ve Google Drive linklerinden akışkan bir sosyal medya paylaşım
    takvimi üretir. Marka bu takvimi <b>hiçbir uygulama indirmeden</b>, WhatsApp'tan gelen bir linkle açar;
    üzerine tek tek revize yazar. Aşağıda üç rolün akışı ekran ekran anlatılıyor.</p>

    <div class="flow">
      <span>Taslak</span><span>İç onayda</span><span>Markaya hazır</span><span>Markada</span><span>Onaylandı / Revize istendi</span>
    </div>

    <div class="roles">
      <div><h4>Yönetici</h4><p>Planı kurar, AI'yla üretir, düzenler, iç onaya yollar.</p></div>
      <div><h4>İç onaylayan</h4><p>Markaya gitmeden kontrol eder, not bırakır, onaylar.</p></div>
      <div><h4>Marka</h4><p>Sadece link. Görür, videoyu oynatır, revize ister.</p></div>
    </div>
  </header>

  <div class="tabs" role="tablist" aria-label="Roller">
    ${tabs}
  </div>

  ${panels}

  <footer>
    Ritim · Phase 1 demo — ekranlar uygulamanın kendisinden alınmıştır. Görseller yer tutucudur;
    gerçek sürümde postlar Drive'dan, videolar Drive oynatıcısından gelir.
  </footer>
</div>

<div class="lightbox" id="lightbox"><img alt="" /></div>

<script>
  (function(){
    var root=document.documentElement;
    try{var t=localStorage.getItem("ritim-tut-theme");if(t)root.setAttribute("data-theme",t);}catch(e){}
    document.getElementById("themetoggle").addEventListener("click",function(){
      var cur=root.getAttribute("data-theme")|| (matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
      var next=cur==="dark"?"light":"dark";root.setAttribute("data-theme",next);
      try{localStorage.setItem("ritim-tut-theme",next);}catch(e){}
    });

    var tabs=[].slice.call(document.querySelectorAll('[role="tab"]'));
    tabs.forEach(function(tab){
      tab.addEventListener("click",function(){
        tabs.forEach(function(t){
          var on=t===tab;
          t.setAttribute("aria-selected",on);
          var p=document.getElementById("panel-"+t.dataset.target);
          p.hidden=!on;p.classList.toggle("active",on);
        });
        window.scrollTo({top:document.querySelector(".tabs").offsetTop-4,behavior:"smooth"});
        armReveal();
      });
    });

    var lb=document.getElementById("lightbox"),lbImg=lb.querySelector("img");
    document.addEventListener("click",function(e){
      if(e.target.tagName==="IMG"&&e.target.closest("figure")){lbImg.src=e.target.src;lb.classList.add("on");}
      else if(e.target===lb||e.target===lbImg){lb.classList.remove("on");}
    });
    document.addEventListener("keydown",function(e){if(e.key==="Escape")lb.classList.remove("on");});

    function armReveal(){
      var els=[].slice.call(document.querySelectorAll(".panel:not([hidden]) .reveal:not(.in)"));
      if(!("IntersectionObserver"in window)){els.forEach(function(el){el.classList.add("in");});return;}
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add("in");io.unobserve(en.target);}});
      },{threshold:.1});
      els.forEach(function(el){io.observe(el);});
    }
    armReveal();
  })();
</script>`;

writeFileSync(OUT, html);
console.log("wrote", OUT, (Buffer.byteLength(html) / 1e6).toFixed(2), "MB");
