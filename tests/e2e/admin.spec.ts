import { test, expect } from "@playwright/test";

const ADMIN = "http://admin.localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@boomzino.example";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme123";

test("admin logs in, edits the heading, and the landing reflects it", async ({ page }) => {
  // Guard redirects an anonymous visitor to login.
  await page.goto(`${ADMIN}/admin`);
  await expect(page).toHaveURL(/\/admin\/login/);

  // Log in.
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // RSC client-side navigation doesn't fire a "load" event; use "commit" instead.
  await page.waitForURL(`${ADMIN}/admin`, { waitUntil: "commit" });

  // Open the seeded landing.
  await page.getByRole("link", { name: "Boomzino Demo" }).click();
  await expect(page.getByTestId("tab-content")).toBeVisible();

  // Edit the heading on the Content tab (default) and save.
  const heading = page.getByLabel("Heading");
  await heading.fill("Spin & Win Big");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  // The public landing (different host) reflects the edit immediately.
  await page.goto("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: "Spin & Win Big" })).toBeVisible();

  // Restore the original heading so other specs (landing.spec.ts) are not affected.
  await page.goto(`${ADMIN}/admin`);
  await page.getByRole("link", { name: "Boomzino Demo" }).click();
  await expect(page.getByTestId("tab-content")).toBeVisible();
  const headingField = page.getByLabel("Heading");
  await headingField.fill("Spin the Wheel");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
});

test.afterAll(async () => {
  // Note: this test mutates the seeded heading during the run but restores it inline.
  // Re-run `npm run db:seed` to fully reset demo data if needed.
});
