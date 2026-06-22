import { test, expect } from "@playwright/test";

test("3D Alchemy Lab route boots a WebGL canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto("/prototypes/3d/alchemy-lab");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test.describe("spin to win", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("SPIN reveals the win sheet with the concrete prize", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/prototypes/3d/alchemy-lab");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sound-toggle")).toBeVisible();
    await expect(page.getByTestId("win-modal")).toBeHidden();
    // force skips Playwright's rAF-based stability wait, which stalls while the R3F loop starves requestAnimationFrame under SwiftShader
    await page.getByTestId("spin-button").click({ force: true });
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("500 Free Spins")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("claim-open")).toBeVisible({ timeout: 15_000 });
  });
});
