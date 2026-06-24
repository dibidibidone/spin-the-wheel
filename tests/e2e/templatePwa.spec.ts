import { test, expect } from "@playwright/test";

const HOST = process.env.E2E_HOST ?? "http://jackpot.localhost:3000";

test("jackpot-vault template renders a WebGL canvas from the DB", async ({ page }) => {
  const resp = await page.goto(`${HOST}/`);
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
});

test("serves a per-landing manifest with the configured app", async ({ request }) => {
  const res = await request.get(`${HOST}/manifest`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/manifest+json");
  const m = await res.json();
  expect(m.name).toBe("Boomzino App");
  expect(m.start_url).toBe("/go");
});

test("/go redirects to the configured app link", async ({ request }) => {
  const res = await request.get(`${HOST}/go`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toBe("https://example.com/offer?app=1");
});

const SLOT = HOST.replace("jackpot.", "bookofra.");

test("slot landing serves its manifest with the slot app name", async ({ request }) => {
  const res = await request.get(`${SLOT}/manifest`);
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBe("Book of Riches");
  expect(m.start_url).toBe("/go");
});

test("slot /go redirects to the slot offer link", async ({ request }) => {
  const res = await request.get(`${SLOT}/go`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toBe("https://example.com/slot-offer?app=1");
});

test("the 2D classic wheel links a manifest in its head", async ({ page }) => {
  const home = HOST.replace("jackpot.localhost", "localhost");
  await page.goto(home);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest");
});
