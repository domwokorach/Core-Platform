import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Two dev servers: the real app (authentication required, origin localhost:3000 registered with Keycloak)
// and an opt-in demo-mode copy (NEXT_PUBLIC_DEMO_MODE) for UI specs that run without a session.
// Admin credentials for realm-timeout tests come from the git-ignored root .env (never hard-coded, never printed).
try { for (const line of readFileSync("../.env", "utf8").split("\n")) { const m = /^(KC_BOOTSTRAP_ADMIN_PASSWORD)=(.+)$/.exec(line); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch { /* no .env: those tests skip */ }
const logoToken = "pk_test_playwright_token";
const demo = { baseURL: "http://127.0.0.1:3100" };

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { trace: "on-first-retry", locale: "en-GB", timezoneId: "Europe/London" },
  projects: [
    { name: "chromium", testIgnore: ["auth*.spec.ts", "merchant-logos-live.spec.ts", "designer-cards-visa.spec.ts"], use: { ...devices["Desktop Chrome"], ...demo } },
    { name: "auth-desktop", testMatch: "auth.spec.ts", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" } },
    { name: "logos-live", testMatch: ["merchant-logos-live.spec.ts", "designer-cards-visa.spec.ts"], use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" } },
    { name: "auth-demo", testMatch: "auth-demo.spec.ts", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3200" } },
    { name: "auth-register", testMatch: "auth-register.spec.ts", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" } },
    { name: "auth-ui", testMatch: "auth-ui.spec.ts", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" } },
    { name: "auth-tablet", testMatch: "auth.spec.ts", use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true, baseURL: "http://localhost:3000" } },
    { name: "auth-mobile", testMatch: "auth.spec.ts", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: "http://localhost:3000" } },
  ],
  webServer: [
    { command: "npm run dev -- --port 3000 --hostname 0.0.0.0", url: "http://127.0.0.1:3000/login?error=callback" /* IPv4 on purpose: Docker publishes on 127.0.0.1, `localhost` may resolve to ::1 and trigger a second, shadowing dev server */, env: { NEXT_PUBLIC_LOGO_DEV_TOKEN: logoToken, NEXT_PUBLIC_VISA_BRANDING_APPROVED: "false" }, reuseExistingServer: !process.env.CI, timeout: 90_000 },
    { command: "npm run dev -- --port 3100 --hostname 127.0.0.1", url: "http://127.0.0.1:3100/login?error=callback", env: { NEXT_PUBLIC_LOGO_DEV_TOKEN: logoToken, NEXT_PUBLIC_VISA_BRANDING_APPROVED: "false", NEXT_PUBLIC_DEMO_MODE: "true", NEXT_DIST_DIR: ".next-demo", NEXT_PUBLIC_APP_ORIGIN: "http://127.0.0.1:3100" }, reuseExistingServer: !process.env.CI, timeout: 90_000 },
    // Development demo sign-in: needs the server-side opt-in, which a production build can never honour.
    // CI runs the sample-data UI suite only, so it sets PW_SKIP_DEMOAUTH=1 to avoid starting this extra server.
    ...(process.env.PW_SKIP_DEMOAUTH ? [] : [
    { command: "npm run dev -- --port 3200 --hostname 0.0.0.0", url: "http://127.0.0.1:3200/login?error=callback", env: { FINIX_DEMO_AUTH: "true", NEXT_DIST_DIR: ".next-demoauth", NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3200", NEXT_PUBLIC_LOGO_DEV_TOKEN: logoToken, NEXT_PUBLIC_VISA_BRANDING_APPROVED: "false" }, reuseExistingServer: !process.env.CI, timeout: 90_000 },
    ]),
  ],
});
