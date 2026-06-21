import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Load .env into process.env so Playwright tests can read ADMIN_EMAIL, ADMIN_PASSWORD, etc.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:3000" },
});
