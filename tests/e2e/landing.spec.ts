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

  // Claim opens the PWA via the same-origin /go redirector (which then 302s to the
  // offer link). Assert the claim navigates to /go — the meaningful new behavior —
  // rather than chasing the external redirect target.
  const goRequest = page.waitForRequest(/\/go$/, { timeout: 10_000 });
  await page.getByRole("button", { name: "Claim bonus" }).click();
  await goRequest;
});
