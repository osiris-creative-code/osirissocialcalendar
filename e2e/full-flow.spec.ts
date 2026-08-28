import { test, expect } from "@playwright/test";

test("full workflow: create -> generate -> internal approve -> brand view -> revise", async ({
  page,
  context,
}) => {
  // --- team gate ---
  await page.goto("/app");
  await page.getByLabel("Ekip kodu").fill("ritim-dev");
  await page.getByRole("button", { name: "Devam" }).click();

  // --- role pick ---
  await page.getByLabel("Adınız").fill("Derya");
  await page.getByLabel("Rol").selectOption("yonetici");
  await page.getByRole("button", { name: "Gir" }).click();

  // --- new brand ---
  await page.getByRole("button", { name: "＋ Marka ekle" }).click();
  await page.getByLabel("Marka adı").fill("Deniz Cafe");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.getByText("Deniz Cafe").click();

  // --- new plan ---
  await page.getByRole("button", { name: "Yeni plan" }).click();
  await page.getByLabel("Başlık").fill("Eylül");
  await page.getByLabel("Başlangıç").fill("2026-08-28");
  await page.getByLabel("Bitiş").fill("2026-09-11");
  await page.getByRole("button", { name: "Oluştur" }).click();

  // --- generate -> gap modal ---
  await page.getByRole("button", { name: "Takvimi üret" }).click();
  await page.getByRole("button", { name: /Kurala kadar uzat/ }).click();
  await expect(page.getByText(/POST/).first()).toBeVisible();

  // --- send to internal ---
  await page.getByRole("button", { name: "İç onaya gönder" }).click();
  const internalLink = await page.getByTestId("internal-link").getAttribute("href");
  expect(internalLink).toContain("/i/");

  // --- internal approve ---
  const p2 = await context.newPage();
  await p2.goto(internalLink!);
  await p2.getByRole("button", { name: "Onayla", exact: true }).click();
  const brandLink = await p2.getByTestId("brand-link").getAttribute("href");
  expect(brandLink).toContain("/c/");

  // --- brand view ---
  const p3 = await context.newPage();
  await p3.goto(brandLink!);
  await expect(p3.getByText("Deniz Cafe")).toBeVisible(); // splash
  await expect(p3.getByRole("button", { name: "Izgara" })).toBeVisible({ timeout: 8000 });
  await p3.getByRole("button", { name: /Revize iste/ }).first().click();
  await p3.getByRole("button", { name: "Revizeleri gönder" }).click();
  await expect(p3.getByText(/Revizeleriniz ekibe iletildi/)).toBeVisible();
});
