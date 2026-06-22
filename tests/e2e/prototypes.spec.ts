import { test, expect } from "@playwright/test";

test("prototype gallery lists both Boomzino mockups", async ({ page }) => {
  const resp = await page.goto("/prototypes/index.html");
  expect(resp?.status()).toBe(200);
  await expect(page.getByRole("link", { name: /Alchemy Lab/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Jackpot Boom Vault/i })).toBeVisible();
});

test("Alchemy Lab loads standalone, has no console errors, spins to a win", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  const resp = await page.goto("/prototypes/boomzino-alchemy-lab.html");
  expect(resp?.status()).toBe(200);

  // standalone: must not pull in the app's stylesheet or Next bundles
  expect(await page.locator('link[href*="globals"], link[href^="/_next"], script[src^="/_next"]').count()).toBe(0);

  await expect(page.getByTestId("wheel-rotor")).toBeVisible();
  const spin = page.getByTestId("spin-button");
  await expect(spin).toBeVisible();
  // win overlay must be hidden until a spin completes
  await expect(page.getByTestId("win-burst")).toBeHidden();
  await spin.click();
  await expect(page.getByTestId("win-burst")).toBeVisible({ timeout: 10_000 });

  expect(errors).toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("Alchemy Lab still reaches the win state with reduced motion", async ({ page }) => {
    await page.goto("/prototypes/boomzino-alchemy-lab.html");
    await page.getByTestId("spin-button").click();
    await expect(page.getByTestId("win-burst")).toBeVisible({ timeout: 10_000 });
  });
});

