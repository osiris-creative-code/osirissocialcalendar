import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:60370";
const OUT = process.env.OUT ?? "/private/tmp/claude-501/-Users-deralist-Desktop-WebApps--Bots--Apps-and-AI-Social-Media-Planning-And-Calendar/76ce6d48-9519-4b31-945d-ce20cdfcd82d/scratchpad/shots";
mkdirSync(OUT, { recursive: true });

const dbPath = "./.data/db.json";
const readDb = () => JSON.parse(readFileSync(dbPath, "utf8"));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

let n = 0;
const shot = async (name, p = page) => {
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, "0")}-${name}.png`;
  await p.screenshot({ path: file });
  console.log("saved", file);
};

// ---- gate ----
await page.goto(`${BASE}/app`);
await page.waitForSelector("text=Ekip kodu");
await shot("gate-team");
await page.getByLabel("Ekip kodu").fill("ritim-dev");
await page.getByRole("button", { name: "Devam" }).click();
await page.waitForSelector("text=Adınız");
await page.getByLabel("Adınız").fill("Derya");
await page.getByLabel("Rol").selectOption("yonetici");
await shot("gate-role");
await page.getByRole("button", { name: "Gir" }).click();

// ---- brands ----
await page.waitForSelector("text=Markalar");
await shot("brands");

const elitId = readDb().brands.find((b) => b.name === "Elit Bakery").id;
await page.goto(`${BASE}/app/brands/${elitId}`);
await page.waitForSelector("text=Ayarlar");
await shot("brand-detail");

// ---- new plan ----
await page.goto(`${BASE}/app/brands/${elitId}/plans/new`);
await page.waitForSelector("text=Yeni plan");
await shot("new-plan");
await page.getByRole("button", { name: "Oluştur" }).click();

// ---- editor empty ----
await page.waitForSelector("text=Takvimi üret");
await shot("editor-empty");

// ---- generate -> gap modal ----
await page.getByRole("button", { name: "Takvimi üret" }).click();
await page.waitForSelector("text=İçerik kurala yetişmiyor");
await shot("gap-modal");
await page.getByRole("button", { name: /Kurala kadar uzat/ }).click();

// ---- editor filled ----
await page.waitForSelector("text=Yeniden üret");
await page.waitForTimeout(400);
await shot("editor-filled");

// ---- send to internal ----
await page.getByRole("button", { name: "İç onaya gönder" }).click();
await page.waitForSelector('[data-testid="internal-link"]');
await page.waitForTimeout(300);
await shot("editor-internal-link");

const plan = readDb().plans[0];

// ---- internal preview ----
const p2 = await ctx.newPage();
await p2.goto(`${BASE}/i/${plan.internalToken}`);
await p2.waitForSelector("text=İÇ ONAY");
await p2.waitForTimeout(500);
await shot("internal-top", p2);
await p2.evaluate(() => window.scrollBy(0, 380));
await p2.waitForTimeout(300);
await shot("internal-cards", p2);
await p2.evaluate(() => window.scrollTo(0, 0));
await p2.getByRole("button", { name: "Onayla", exact: true }).click();
await p2.waitForSelector('[data-testid="brand-link"]');
await p2.waitForTimeout(300);
await shot("internal-approved", p2);

const brandToken = readDb().plans[0].publicToken;

// ---- brand name prompt (isolated shot) ----
const pName = await ctx.newPage();
await pName.goto(`${BASE}/c/${brandToken}`);
await pName.waitForTimeout(4600); // let splash finish
await pName.locator(".absolute.inset-0").first().click({ position: { x: 120, y: 90 } });
await pName.getByRole("textbox", { name: "Düzeltme notu" }).first().fill("Bu köşede logo net değil");
await pName.getByRole("button", { name: "Kaydet" }).first().click();
await pName.locator('input[aria-label="Adınız"]').waitFor({ state: "visible", timeout: 5000 });
await pName.waitForTimeout(200);
await shot("brand-name-prompt", pName);
await pName.close();

// ---- brand view (name pre-seeded for a clean walkthrough) ----
const p3 = await ctx.newPage();
await p3.addInitScript(() => localStorage.setItem("ritim-name", "Elit Bakery ekibi"));
await p3.goto(`${BASE}/c/${brandToken}`);
await p3.waitForSelector("text=Sosyal Medya Paylaşım Takvimi");
await p3.waitForTimeout(400);
await shot("brand-splash", p3);
await p3.waitForTimeout(4200);
await shot("brand-grid", p3);

// pin annotation
const media = p3.locator(".absolute.inset-0").first();
await media.click({ position: { x: 120, y: 90 } });
await p3.waitForTimeout(300);
await shot("brand-pin", p3);
await p3.getByRole("textbox", { name: "Düzeltme notu" }).first().fill("Logo biraz daha büyük olsun");
await p3.waitForTimeout(200);
await shot("brand-pin-note", p3);
await p3.getByRole("button", { name: "Kaydet" }).first().click();
await p3.waitForTimeout(500);
await shot("brand-pin-saved", p3);

// timeline
await p3.getByRole("button", { name: "Zaman çizelgesi" }).click();
await p3.waitForTimeout(400);
await shot("brand-timeline", p3);

// approve one, request changes visible, then submit
await p3.getByRole("button", { name: /Revize iste/ }).first().click();
await p3.waitForTimeout(200);
await p3.getByRole("button", { name: "Revizeleri gönder" }).click();
await p3.waitForSelector("text=Teşekkürler");
await p3.waitForTimeout(300);
await shot("brand-confirm", p3);

// ---- queue (manager) ----
await page.goto(`${BASE}/app/queue`);
await page.waitForSelector("text=Onay kuyruğu");
await shot("queue", page);

await browser.close();
console.log("done:", n, "shots");
