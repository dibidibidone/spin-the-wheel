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
  test("SPIN reaches the win modal; overlay UI present", async ({ page }) => {
    await page.goto("/prototypes/3d/alchemy-lab");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sound-toggle")).toBeVisible();
    await expect(page.getByTestId("win-modal")).toBeHidden();
    await page.getByTestId("spin-button").click();
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("JACKPOT!")).toBeVisible();
  });
});
