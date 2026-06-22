// tests/e2e/bookOfRa.spec.ts
import { test, expect } from "@playwright/test";

test("Book of Ra route boots a WebGL canvas with no page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto("/prototypes/3d/book-of-ra");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test.describe("near-miss then win", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } }); // shortens reels to ~350ms
  test("spin 1 near-miss -> try again -> spin 2 win -> WinSheet", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/prototypes/3d/book-of-ra");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("win-modal")).toBeHidden();
    const spin = page.getByTestId("spin-button");
    await spin.click({ force: true }); // spin 1
    await expect(spin).toHaveText(/try again/i, { timeout: 30_000 });
    await spin.click({ force: true }); // spin 2
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("200 Free Spins")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("claim-open")).toBeVisible({ timeout: 15_000 });
  });
});
