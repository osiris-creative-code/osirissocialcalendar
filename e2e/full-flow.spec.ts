import { test, expect } from "@playwright/test";

test("full workflow: create -> generate -> internal approve -> brand view -> revise", async ({
  page,
  context,
}) => {
  // --- team gate ---
  await page.goto("/app");
  await page.getByLabel("Ekip kodu").fill("osiris-dev");
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

  // --- prompt + generate -> gap modal ---
  await page.getByLabel("Plan promptu").fill("2 günde bir post, her gün story, haftada 1 reels");
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

test("publish flow: approve -> yayına al -> mark all -> tamamlandı", async ({ page, context }) => {
  await page.goto("/app");
  await page.getByLabel("Ekip kodu").fill("osiris-dev");
  await page.getByRole("button", { name: "Devam" }).click();
  await page.getByLabel("Adınız").fill("Derya");
  await page.getByLabel("Rol").selectOption("yonetici");
  await page.getByRole("button", { name: "Gir" }).click();

  await page.getByRole("button", { name: "＋ Marka ekle" }).click();
  await page.getByLabel("Marka adı").fill("Yayın Kafe");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await page.getByText("Yayın Kafe").click();

  await page.getByRole("button", { name: "Yeni plan" }).click();
  await page.getByLabel("Başlık").fill("Eylül");
  await page.getByLabel("Başlangıç").fill("2026-09-01");
  await page.getByLabel("Bitiş").fill("2026-09-07");
  await page.getByRole("button", { name: "Oluştur" }).click();

  await page.getByLabel("Plan promptu").fill("2 günde bir post, her gün story, haftada 1 reels");
  await page.getByRole("button", { name: "Takvimi üret" }).click();
  await page.getByRole("button", { name: /Kurala kadar uzat/ }).click();
  await expect(page.getByText(/POST/).first()).toBeVisible();
  const planUrl = page.url();

  const planId = planUrl.split("/plans/")[1];

  await page.getByRole("button", { name: "İç onaya gönder" }).click();
  const internalLink = await page.getByTestId("internal-link").getAttribute("href");

  const p2 = await context.newPage();
  await p2.goto(internalLink!);
  await p2.getByRole("button", { name: "Onayla", exact: true }).click();
  // brand link appears only once the plan reached "markada"
  await expect(p2.getByTestId("brand-link")).toBeVisible();

  // brand approves the whole plan -> stage goes to "onaylandi"
  const submit = await page.request.post(`/api/plans/${planId}/submit`, {
    data: { round: "onay", authorName: "Marka" },
  });
  expect(submit.ok()).toBeTruthy();

  // team: back to the plan editor -> publish
  await page.goto(planUrl);
  await page.getByRole("button", { name: "Yayına al" }).click();
  await expect(page.getByRole("heading", { name: "Yayın takibi" })).toBeVisible();

  await expect(page.getByRole("checkbox").first()).toBeVisible();
  await page.waitForTimeout(500); // let the list finish rendering
  for (const box of await page.getByRole("checkbox").all()) await box.check();

  // reload until the server has recorded every publish and closed the plan out
  await expect
    .poll(
      async () => {
        await page.reload();
        return page.getByText("Tamamlandı").count();
      },
      { timeout: 20000 },
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole("checkbox", { checked: false })).toHaveCount(0);
  await expect(page.getByText(/(\d+) \/ \1 paylaşıldı/)).toBeVisible();
});
