import { test, expect } from "@playwright/test";

test("spins twice (near-miss) then wins and claims", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Spin the Wheel" })).toBeVisible();

  const spin = page.getByTestId("spin-button");

  // Spin 1 -> near-miss
  await spin.click();
  await expect(page.getByTestId("almost-text")).toBeVisible({ timeout: 10_000 });

  // Spin 2 -> near-miss (spinsBeforeWin = 3 in seed)
  await spin.click();
  await expect(page.getByTestId("almost-text")).toBeVisible({ timeout: 10_000 });

  // Spin 3 -> win
  await spin.click();
  await expect(page.getByText("You won JACKPOT!")).toBeVisible({ timeout: 10_000 });

  // Claim redirects to the configured URL with the prize param.
  // boomzino.example is not a real domain; intercept the navigation so it commits
  // cleanly and the URL assertion can be verified deterministically.
  await page.route("**/signup**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "ok" })
  );
  await page.getByRole("button", { name: "Claim bonus" }).click();
  await page.waitForURL(/boomzino\.example\/signup\?bonus=JACKPOT/, { timeout: 10_000 });
});
