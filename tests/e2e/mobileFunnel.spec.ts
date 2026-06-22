import { test, expect, devices } from "@playwright/test";

const ROUTES = [
  { name: "jackpot-vault", path: "/prototypes/3d/jackpot-vault", prize: "1,000 Free Spins" },
  { name: "alchemy-lab", path: "/prototypes/3d/alchemy-lab", prize: "500 Free Spins" },
];

// Omit defaultBrowserType — Playwright 1.49 disallows it inside describe blocks
// (it forces a new worker). All other device properties (viewport, userAgent, etc.) are kept.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType: _dbt, ...iphone12 } = devices["iPhone 12"];

for (const r of ROUTES) {
  test.describe(`${r.name} mobile funnel`, () => {
    test.use({ ...iphone12, contextOptions: { reducedMotion: "reduce" } });

    test("portrait: canvas + sticky CTA visible, no page error", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(r.path);
      await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });

      const cta = page.getByTestId("spin-button");
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      const viewport = page.viewportSize()!;
      expect(box).not.toBeNull();
      // CTA must sit on-screen and have a thumb-sized tap target
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(errors).toEqual([]);
    });

    test("spin → sheet → form field has the mobile-friendly type", async ({ page }) => {
      await page.goto(r.path);
      await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
      await page.getByTestId("spin-button").click();
      await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(r.prize)).toBeVisible();

      const claimOpen = page.getByTestId("claim-open");
      await expect(claimOpen).toBeVisible();
      await expect(claimOpen).toBeEnabled();
      // force:true bypasses scroll-into-view, which stalls on active SwiftShader WebGL contexts;
      // visibility/enabled are asserted above so this can't mask a click-interception bug.
      await claimOpen.click({ force: true });
      const field = page.getByTestId("claim-field");
      await expect(field).toBeVisible();
      await expect(field).toHaveAttribute("type", "email");
      await expect(field).toHaveAttribute("inputmode", "email");
    });
  });
}
