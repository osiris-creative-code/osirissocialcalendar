import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Not a test — screenshot generator for the in-app guide (/app/rehber).
 * Run:  npx playwright test capture-rehber
 * Writes PNGs into public/rehber/.
 */
const OUT = join(process.cwd(), "public", "rehber");
mkdirSync(OUT, { recursive: true });
const shot = (name: string) => join(OUT, `${name}.png`);

test.use({ viewport: { width: 1280, height: 820 } });

test("capture guide screenshots", async ({ page, context }) => {
  test.skip(!process.env.CAPTURE, "set CAPTURE=1 to regenerate /app/rehber screenshots");
  await page.goto("/app");
  await page.getByLabel("Ekip kodu").fill("osiris-dev");
  await page.getByRole("button", { name: "Devam" }).click();
  await page.getByLabel("Adınız").fill("Derya");
  await page.getByLabel("Rol").selectOption("yonetici");
  await page.getByRole("button", { name: "Gir" }).click();

  await expect(page.getByRole("button", { name: "＋ Marka ekle" })).toBeVisible();
  await page.screenshot({ path: shot("y1-markalar") });

  await page.getByRole("button", { name: "＋ Marka ekle" }).click();
  await page.getByLabel("Marka adı").fill("Deniz Cafe");
  await page.getByLabel("Instagram kullanıcı adı").fill("denizcafe");
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot("y2-marka-ekle") });
  await page.getByRole("button", { name: "Ekle", exact: true }).click();

  await page.getByText("Deniz Cafe").click();
  await expect(page.getByRole("button", { name: "Yeni plan" })).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot("y3-marka-ayar") });

  await page.getByRole("button", { name: "Yeni plan" }).click();
  await page.getByLabel("Başlık").fill("Eylül Takvimi");
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot("y4-yeni-plan") });
  await page.getByRole("button", { name: "Oluştur" }).click();

  // Range now lives in the editor, next to the prompt.
  await page.getByLabel("Başlangıç").fill("2026-09-01");
  await page.getByLabel("Bitiş").fill("2026-09-14");
  await page.getByLabel("Plan promptu").click();

  await expect(page.getByRole("button", { name: "Takvimi üret" })).toBeVisible();
  const planUrl = page.url();
  const planId = planUrl.split("/plans/")[1];

  // editor: drive link + reels + prompt all live here now
  await page
    .getByLabel("Drive klasör linki")
    .fill("https://drive.google.com/drive/folders/1ERCI3_Boyutlandirilmis_abcdef");
  await page
    .getByLabel("Plan promptu")
    .fill("2 günde bir post, her gün story, haftada 1 reels. 7 Eylül'e özel post. Story'lere açıklama yazma.");
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot("y5-icerik-yukle") });

  await page.getByRole("button", { name: "Plan öner" }).click();
  await expect(page.getByRole("button", { name: "Uygula" })).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot("y5b-plan-oner") });
  await page.getByRole("button", { name: "Kapat" }).click();

  await page.getByRole("button", { name: "Takvimi üret" }).click();
  await expect(page.getByRole("button", { name: /Kurala kadar uzat/ })).toBeVisible();
  await page.screenshot({ path: shot("y6-uret") });
  await page.getByRole("button", { name: /Kurala kadar uzat/ }).click();

  await expect(page.getByText(/POST/).first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("y7-takvim") });

  await page.getByRole("button", { name: "İç onaya gönder" }).click();
  await expect(page.getByTestId("internal-link")).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot("y8-ic-onaya-gonder") });
  const internalLink = await page.getByTestId("internal-link").getAttribute("href");

  // ---------- approver side ----------
  const p2 = await context.newPage();
  await p2.setViewportSize({ width: 1280, height: 820 });
  await p2.goto(internalLink!);
  await p2.waitForTimeout(600);
  await p2.screenshot({ path: shot("o1-link-ac") });
  await p2.waitForTimeout(1500);

  await expect(p2.getByRole("button", { name: "Izgara" })).toBeVisible({ timeout: 8000 });
  await p2.screenshot({ path: shot("o2-inceleme") });

  // scroll to a card to show the per-item ✓ Onayla / ↺ Revize iste controls
  const revize = p2.getByRole("button", { name: /Revize iste/ }).first();
  await revize.scrollIntoViewIfNeeded();
  await p2.waitForTimeout(200);
  await p2.screenshot({ path: shot("o3-onayla") });

  // leave a note and send back to the manager (this posts a comment + returns the plan to Taslak)
  await p2.getByPlaceholder("Adınız").fill("Selin");
  await p2.getByPlaceholder(/Geri gönderme notu/).fill("1 Eylül postunun görselini değiştirelim.");
  await p2.waitForTimeout(200);
  await p2.screenshot({ path: shot("o4-geri-gonder") });
  await p2.getByRole("button", { name: /Yöneticiye geri gönder/ }).click();
  await p2.waitForTimeout(700);

  // ---------- back to manager: feedback inbox ----------
  // ensure there is at least one comment to show, whatever the send-back flow did
  const full = await (await page.request.get(`/api/plans/${planId}`)).json();
  const firstItem = (full.items as { id: string }[])[0];
  await page.request.post(`/api/plans/${planId}/comments`, {
    data: {
      itemId: firstItem.id,
      stage: "internal",
      authorName: "Selin",
      authorRole: "onaylayan",
      body: "1 Eylül postunun görselini değiştirelim, biraz daha aydınlık olsun.",
      status: "changes",
    },
  });
  await page.goto(planUrl);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot("y9-geri-bildirim") });

  // ---------- a second plan, driven straight to "onaylandi" via the API, for the publish shots ----------
  const brandId = (await (await page.request.get("/api/brands")).json())[0].id;
  const plan2 = await (
    await page.request.post("/api/plans", {
      data: {
        brandId,
        title: "Yayın Örneği",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-10",
        prompt: "2 günde bir post, her gün story",
      },
    })
  ).json();
  await page.request.post(`/api/plans/${plan2.id}/generate`, { data: { mode: "extend" } });
  for (const to of ["ic_onayda", "markaya_hazir", "markada"]) {
    await page.request.post(`/api/plans/${plan2.id}/stage`, {
      data: { to, actorName: "Selin", actorRole: "onaylayan" },
    });
  }
  await page.request.post(`/api/plans/${plan2.id}/submit`, {
    data: { round: "onay", authorName: "Marka" },
  });

  await page.goto(`/app/plans/${plan2.id}`);
  const yayina = page.getByRole("button", { name: "Yayına al" });
  await expect(yayina).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: shot("y10-yayina-al") });
  await yayina.click();
  await expect(page.getByRole("heading", { name: "Yayın takibi" })).toBeVisible();
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("y11-yayin-takibi") });
});
