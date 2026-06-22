import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Load .env into process.env so Playwright tests can read ADMIN_EMAIL, ADMIN_PASSWORD, etc.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  // Limit to 1 worker: the 3D specs spin up WebGL contexts that compete for GPU resources
  // when run in parallel, causing RAF starvation and context loss. Serial execution is the
  // standard practice for WebGL-heavy e2e suites.
  workers: 1,
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:3000" },
});
