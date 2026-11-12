# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> expired application session renews silently while the SSO session lives; asks to sign in once it has ended
- Location: tests/auth.spec.ts:195:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:3000/cards"
Received: "http://localhost:3000/login?returnTo=%2Fcards&error=expired"
Timeout:  30000ms

Call log:
  - Expect "toHaveURL" with timeout 30000ms
    - waiting for "http://localhost:3000/login?returnTo=%2Fcards" navigation to finish...
    - navigated to "http://localhost:3000/login?returnTo=%2Fcards&error=expired"
    54 × locator resolved to <html lang="en" class="Ur3q_a_variable iaM1Ya_variable light">…</html>
       - unexpected value "http://localhost:3000/login?returnTo=%2Fcards&error=expired"

```

```yaml
- link "Skip to sign in":
  - /url: "#signin"
- complementary "About FINIX":
  - text: FINIX
  - heading "Your money. Your future. Your FINIX." [level=2]
  - paragraph: Experience a smarter way to manage your finances with clarity, confidence and control.
  - text: Protected by secure authentication
  - paragraph: Designed for the way you bank.
- main:
  - heading "Sign in to your account" [level=1]
  - paragraph: Welcome back to FINIX. Securely access all your banking services with one account.
  - alert:
    - paragraph: Your session has ended
    - paragraph: For your security you were signed out. Please sign in again.
  - button "Try again"
  - paragraph: You enter your password only on FINIX's secure sign-in page.
  - text: © 2026 FINIX
  - link "Privacy Policy":
    - /url: /privacy
  - link "Terms of Service":
    - /url: /terms
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | /**
  4   |  * Single sign-on end to end: FINIX (localhost:3000) -> Keycloak (localhost:8081, realm `finix`) -> FINIX -> Spring API (localhost:8080).
  5   |  * Start the stack first (`docker compose up -d postgres keycloak`, API on :8080). Skipped when Keycloak is unreachable.
  6   |  * Runs as desktop, tablet and mobile projects. `localhost` is used because the realm registers only http://localhost:3000/auth/callback.
  7   |  */
  8   | const APP = "http://localhost:3000";
  9   | const KEYCLOAK = "http://localhost:8081";
  10  | const API = "http://localhost:8080";
  11  | const USER = { username: "alex", password: "DemoPass123!" };
  12  | const ADMIN_PASSWORD = process.env.KC_BOOTSTRAP_ADMIN_PASSWORD ?? "";
  13  | const AUTH_ENDPOINT = "/realms/finix/protocol/openid-connect/auth";
  14  | 
  15  | test.describe.configure({ mode: "serial", timeout: 90_000 });
  16  | test.use({ actionTimeout: 20_000 });
  17  | test.beforeAll(async ({ request }) => {
  18  |   const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
  19  |   test.skip(!up, "Local Keycloak is not running");
  20  | });
  21  | 
  22  | /** Temporarily changes realm settings through the Keycloak admin API; returns an idempotent restore function. */
  23  | async function setRealm(request: import("@playwright/test").APIRequestContext, patch: Record<string, number>) {
  24  |   const tokenRes = await request.post(`${KEYCLOAK}/realms/master/protocol/openid-connect/token`, { form: { grant_type: "password", client_id: "admin-cli", username: "admin", password: ADMIN_PASSWORD } });
  25  |   test.skip(!tokenRes.ok(), "Keycloak admin credentials not available (set KC_BOOTSTRAP_ADMIN_PASSWORD)");
  26  |   const headers = { Authorization: `Bearer ${(await tokenRes.json()).access_token}` };
  27  |   const before = (await (await request.get(`${KEYCLOAK}/admin/realms/finix`, { headers })).json()) as Record<string, number>;
  28  |   const original = Object.fromEntries(Object.keys(patch).map(k => [k, before[k]]));
  29  |   await request.put(`${KEYCLOAK}/admin/realms/finix`, { headers, data: patch });
  30  |   let done = false;
  31  |   return async () => { if (done) return; done = true; await request.put(`${KEYCLOAK}/admin/realms/finix`, { headers, data: original }); };
  32  | }
  33  | 
  34  | /** Counts navigations to the Keycloak authorization endpoint: a login prompt or SSO round trip. */
  35  | function trackAuthRequests(page: Page) {
  36  |   const urls: string[] = [];
  37  |   page.on("request", r => { if (r.isNavigationRequest() && r.url().startsWith(KEYCLOAK + AUTH_ENDPOINT)) urls.push(r.url()); });
  38  |   return urls;
  39  | }
  40  | async function submitCredentials(page: Page, password = USER.password) {
  41  |   await page.locator("#username").fill(USER.username);
  42  |   await page.locator("#password").fill(password);
  43  |   await page.locator("#kc-login").click();
  44  | }
  45  | async function signInTo(page: Page, path: string) {
  46  |   await page.goto(`${APP}${path}`);
  47  |   await page.waitForURL(`${KEYCLOAK}/**`);
  48  |   await submitCredentials(page);
  49  | }
  50  | const authenticated = async (page: Page, path: string) => {
> 51  |   await expect(page).toHaveURL(`${APP}${path}`, { timeout: 30_000 });
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  52  |   await expect(page.getByRole("button", { name: "Open profile menu" })).toBeVisible();
  53  | };
  54  | 
  55  | test("protected page -> /login?returnTo -> one themed Keycloak screen -> back on /cards, single code exchange", async ({ page }) => {
  56  |   const hops: string[] = [];
  57  |   page.on("request", r => { if (r.isNavigationRequest() && r.url().startsWith(APP + "/login")) hops.push(new URL(r.url()).search); });
  58  |   const tokenCalls: number[] = [];
  59  |   page.on("response", r => { if (r.url().endsWith("/protocol/openid-connect/token")) tokenCalls.push(r.status()); });
  60  | 
  61  |   await page.goto(`${APP}/cards`);
  62  |   await page.waitForURL(`${KEYCLOAK}/**`);
  63  |   expect(hops, "the app sent the visitor through /login with the destination").toContain("?returnTo=%2Fcards");
  64  | 
  65  |   // Exactly one credential form, and it is the FINIX-themed Keycloak page.
  66  |   await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  67  |   await expect(page.getByText("Enter your details to securely access your FINIX dashboard.")).toBeVisible();
  68  |   await expect(page.locator("input[type=password]")).toHaveCount(1);
  69  |   await expect(page.getByLabel("Email address or username")).toBeVisible();
  70  |   await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  71  |   await expect(page.locator(".finix-brand")).toBeVisible();
  72  | 
  73  |   await submitCredentials(page);
  74  |   await authenticated(page, "/cards");
  75  |   expect(tokenCalls, "single-use authorization code exchanged exactly once").toEqual([200]);
  76  |   expect(page.url()).not.toMatch(/code=|access_token|id_token|state=/);
  77  | });
  78  | 
  79  | test("authorization request uses PKCE S256 with fresh state, nonce and challenge on every attempt", async ({ browser }) => {
  80  |   const attempts: URL[] = [];
  81  |   for (let i = 0; i < 2; i++) {
  82  |     const page = await (await browser.newContext()).newPage();
  83  |     await page.goto(`${APP}/login?returnTo=%2Fcards`);
  84  |     await page.waitForURL(`${KEYCLOAK}/**`);
  85  |     attempts.push(new URL(page.url()));
  86  |     await page.context().close();
  87  |   }
  88  |   const [a, b] = attempts;
  89  |   expect(a.pathname).toBe("/realms/finix/protocol/openid-connect/auth");
  90  |   for (const u of attempts) {
  91  |     expect(u.searchParams.get("client_id")).toBe("finix-web");
  92  |     expect(u.searchParams.get("response_type")).toBe("code");
  93  |     expect(u.searchParams.get("scope")).toBe("openid profile email");
  94  |     expect(u.searchParams.get("code_challenge_method")).toBe("S256");
  95  |     expect(u.searchParams.get("redirect_uri")).toBe(`${APP}/auth/callback`);
  96  |     expect(u.searchParams.get("code_challenge")).toMatch(/^[\w-]{43}$/);
  97  |     expect(u.searchParams.get("state")!.length).toBeGreaterThanOrEqual(16);
  98  |     expect(u.searchParams.get("nonce")).toBeTruthy();
  99  |   }
  100 |   for (const k of ["state", "nonce", "code_challenge"]) expect(a.searchParams.get(k)).not.toBe(b.searchParams.get(k));
  101 | });
  102 | 
  103 | test("session survives in-app navigation and reload with no further sign-in prompt; API calls carry the user", async ({ page }) => {
  104 |   const authHops = trackAuthRequests(page);
  105 |   const apiStatuses: number[] = [];
  106 |   const authFailures: string[] = [];
  107 |   page.on("response", r => {
  108 |     const path = r.url().replace(API, "");
  109 |     if (!path.startsWith("/api/") || r.request().method() !== "GET") return;
  110 |     if ([401, 403].includes(r.status())) authFailures.push(`${r.status()} ${path}`);
  111 |     // Market data depends on a third-party plan/rate limit and live streams have a per-customer connection cap,
  112 |     // so only the request/response banking endpoints are asserted on.
  113 |     if (/^\/api\/(dashboard|accounts|transactions|transfers|cards)/.test(path) && !path.includes("/events")) { apiStatuses.push(r.status()); if (r.status() !== 200) authFailures.push(`${r.status()} (non-auth) ${path}`); }
  114 |   });
  115 | 
  116 |   await signInTo(page, "/cards");
  117 |   await authenticated(page, "/cards");
  118 |   const afterLogin = authHops.length; // the one that showed the form
  119 | 
  120 |   await page.goto(`${APP}/accounts`);
  121 |   await authenticated(page, "/accounts");
  122 |   await expect(page.getByText("£10,524.15").first().or(page.getByRole("heading").first())).toBeVisible();
  123 |   await page.reload();
  124 |   await authenticated(page, "/accounts");
  125 |   for (const path of ["/transactions", "/transfers", "/investments", "/settings"]) { await page.goto(`${APP}${path}`); await authenticated(page, path); }
  126 | 
  127 |   expect(authHops.length, "no new authorization request after the first sign-in").toBe(afterLogin);
  128 |   expect(apiStatuses.length).toBeGreaterThan(0);
  129 |   expect(apiStatuses.every(s => s === 200), `API statuses ${apiStatuses} ${authFailures}`).toBe(true);
  130 |   expect(authFailures, "the API accepted the Keycloak token on every page").toEqual([]);
  131 | });
  132 | 
  133 | test("every supported returnTo is honoured; later visits are single sign-on (no credentials requested)", async ({ page }) => {
  134 |   await signInTo(page, "/login?returnTo=%2Fdashboard".replace(/^/, "")); // credentials once
  135 |   await expect(page).toHaveURL(`${APP}/`, { timeout: 30_000 });      // /dashboard maps to the dashboard home
  136 |   for (const path of ["/cards", "/accounts", "/transactions", "/transfers", "/investments", "/settings"]) {
  137 |     await page.goto(`${APP}/login?returnTo=${encodeURIComponent(path)}`);
  138 |     await expect(page).toHaveURL(`${APP}${path}`, { timeout: 30_000 });
  139 |     await expect(page.locator("input[type=password]")).toHaveCount(0);
  140 |   }
  141 | });
  142 | 
  143 | test("unsafe returnTo values never leave the application", async ({ browser }) => {
  144 |   const evil = ["//evil.example/steal", "https://evil.example", "/\\evil.example", "javascript:alert(1)", "/login", "/auth/callback", "/../../etc/passwd", "/unknown-area"];
  145 |   const context = await browser.newContext();
  146 |   const page = await context.newPage();
  147 |   await page.goto(`${APP}/login?returnTo=${encodeURIComponent(evil[0])}`);
  148 |   await page.waitForURL(`${KEYCLOAK}/**`);
  149 |   await submitCredentials(page);
  150 |   await expect(page).toHaveURL(`${APP}/`, { timeout: 30_000 });
  151 |   for (const value of evil.slice(1)) {
```