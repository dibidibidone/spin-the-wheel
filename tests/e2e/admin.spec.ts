import { test, expect } from "@playwright/test";

const ADMIN = "http://admin.localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@boomzino.example";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme123";

test.afterAll(async ({ browser }) => {
  // Always restore the seeded heading so other specs (landing.spec.ts) are not
  // affected, even when the main test body fails before its own restore.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${ADMIN}/admin/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${ADMIN}/admin`, { waitUntil: "commit" });

  await page.getByRole("link", { name: "Boomzino Demo" }).click();
  await expect(page.getByTestId("tab-content")).toBeVisible();

  await page.getByLabel("Heading").fill("Spin the Wheel");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await ctx.close();
});

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
});
