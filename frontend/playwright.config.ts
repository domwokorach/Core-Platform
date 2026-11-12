import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry", locale: "en-GB", timezoneId: "Europe/London" },
  projects: [ { name: "chromium", use: { ...devices["Desktop Chrome"] } } ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    env: { NEXT_PUBLIC_LOGO_DEV_TOKEN: "pk_test_playwright_token" },
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
