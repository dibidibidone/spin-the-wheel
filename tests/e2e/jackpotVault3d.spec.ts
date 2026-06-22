import { test, expect } from "@playwright/test";

test("3D Jackpot Vault route boots a WebGL canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto("/prototypes/3d/jackpot-vault");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
