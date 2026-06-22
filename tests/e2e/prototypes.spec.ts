import { test, expect } from "@playwright/test";

test("prototype gallery lists both Boomzino mockups", async ({ page }) => {
  const resp = await page.goto("/prototypes/index.html");
  expect(resp?.status()).toBe(200);
  await expect(page.getByRole("link", { name: /Alchemy Lab/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Jackpot Boom Vault/i })).toBeVisible();
});

