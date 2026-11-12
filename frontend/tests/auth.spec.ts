import { test, expect, type Page } from "@playwright/test";

/**
 * Single sign-on end to end: FINIX (localhost:3000) -> Keycloak (localhost:8081, realm `finix`) -> FINIX -> Spring API (localhost:8080).
 * Start the stack first (`docker compose up -d postgres keycloak`, API on :8080). Skipped when Keycloak is unreachable.
 * Runs as desktop, tablet and mobile projects. `localhost` is used because the realm registers only http://localhost:3000/auth/callback.
 */
const APP = "http://localhost:3000";
const KEYCLOAK = "http://localhost:8081";
const API = "http://localhost:8080";
const USER = { username: "alex", password: "DemoPass123!" };
const ADMIN_PASSWORD = process.env.KC_BOOTSTRAP_ADMIN_PASSWORD ?? "";
const AUTH_ENDPOINT = "/realms/finix/protocol/openid-connect/auth";

test.describe.configure({ mode: "serial", timeout: 90_000 });
test.use({ actionTimeout: 20_000 });
test.beforeAll(async ({ request }) => {
  const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
  test.skip(!up, "Local Keycloak is not running");
});

/** Temporarily changes realm settings through the Keycloak admin API; returns an idempotent restore function. */
async function setRealm(request: import("@playwright/test").APIRequestContext, patch: Record<string, number>) {
  const tokenRes = await request.post(`${KEYCLOAK}/realms/master/protocol/openid-connect/token`, { form: { grant_type: "password", client_id: "admin-cli", username: "admin", password: ADMIN_PASSWORD } });
  test.skip(!tokenRes.ok(), "Keycloak admin credentials not available (set KC_BOOTSTRAP_ADMIN_PASSWORD)");
  const headers = { Authorization: `Bearer ${(await tokenRes.json()).access_token}` };
  const before = (await (await request.get(`${KEYCLOAK}/admin/realms/finix`, { headers })).json()) as Record<string, number>;
  const original = Object.fromEntries(Object.keys(patch).map(k => [k, before[k]]));
  await request.put(`${KEYCLOAK}/admin/realms/finix`, { headers, data: patch });
  let done = false;
  return async () => { if (done) return; done = true; await request.put(`${KEYCLOAK}/admin/realms/finix`, { headers, data: original }); };
}

/** Counts navigations to the Keycloak authorization endpoint: a login prompt or SSO round trip. */
function trackAuthRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", r => { if (r.isNavigationRequest() && r.url().startsWith(KEYCLOAK + AUTH_ENDPOINT)) urls.push(r.url()); });
  return urls;
}
async function submitCredentials(page: Page, password = USER.password) {
  await page.locator("#username").fill(USER.username);
  await page.locator("#password").fill(password);
  await page.locator("#kc-login").click();
}
async function signInTo(page: Page, path: string) {
  await page.goto(`${APP}${path}`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await submitCredentials(page);
}
const authenticated = async (page: Page, path: string) => {
  await expect(page).toHaveURL(`${APP}${path}`, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Open profile menu" })).toBeVisible();
};

test("protected page -> /login?returnTo -> one themed Keycloak screen -> back on /cards, single code exchange", async ({ page }) => {
  const hops: string[] = [];
  page.on("request", r => { if (r.isNavigationRequest() && r.url().startsWith(APP + "/login")) hops.push(new URL(r.url()).search); });
  const tokenCalls: number[] = [];
  page.on("response", r => { if (r.url().endsWith("/protocol/openid-connect/token")) tokenCalls.push(r.status()); });

  await page.goto(`${APP}/cards`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  expect(hops, "the app sent the visitor through /login with the destination").toContain("?returnTo=%2Fcards");

  // Exactly one credential form, and it is the FINIX-themed Keycloak page.
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await expect(page.getByText("Enter your details to securely access your FINIX dashboard.")).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(1);
  await expect(page.getByLabel("Email address or username")).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  await expect(page.locator(".finix-brand")).toBeVisible();

  await submitCredentials(page);
  await authenticated(page, "/cards");
  expect(tokenCalls, "single-use authorization code exchanged exactly once").toEqual([200]);
  expect(page.url()).not.toMatch(/code=|access_token|id_token|state=/);
});

test("authorization request uses PKCE S256 with fresh state, nonce and challenge on every attempt", async ({ browser }) => {
  const attempts: URL[] = [];
  for (let i = 0; i < 2; i++) {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`${APP}/login?returnTo=%2Fcards`);
    await page.waitForURL(`${KEYCLOAK}/**`);
    attempts.push(new URL(page.url()));
    await page.context().close();
  }
  const [a, b] = attempts;
  expect(a.pathname).toBe("/realms/finix/protocol/openid-connect/auth");
  for (const u of attempts) {
    expect(u.searchParams.get("client_id")).toBe("finix-web");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("scope")).toBe("openid profile email");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("redirect_uri")).toBe(`${APP}/auth/callback`);
    expect(u.searchParams.get("code_challenge")).toMatch(/^[\w-]{43}$/);
    expect(u.searchParams.get("state")!.length).toBeGreaterThanOrEqual(16);
    expect(u.searchParams.get("nonce")).toBeTruthy();
  }
  for (const k of ["state", "nonce", "code_challenge"]) expect(a.searchParams.get(k)).not.toBe(b.searchParams.get(k));
});

test("session survives in-app navigation and reload with no further sign-in prompt; API calls carry the user", async ({ page }) => {
  const authHops = trackAuthRequests(page);
  const apiStatuses: number[] = [];
  const authFailures: string[] = [];
  page.on("response", r => {
    const path = r.url().replace(API, "");
    if (!path.startsWith("/api/") || r.request().method() !== "GET") return;
    if ([401, 403].includes(r.status())) authFailures.push(`${r.status()} ${path}`);
    // Market data depends on a third-party plan/rate limit and live streams have a per-customer connection cap,
    // so only the request/response banking endpoints are asserted on.
    if (/^\/api\/(dashboard|accounts|transactions|transfers|cards)/.test(path) && !path.includes("/events")) { apiStatuses.push(r.status()); if (r.status() !== 200) authFailures.push(`${r.status()} (non-auth) ${path}`); }
  });

  await signInTo(page, "/cards");
  await authenticated(page, "/cards");
  const afterLogin = authHops.length; // the one that showed the form

  await page.goto(`${APP}/accounts`);
  await authenticated(page, "/accounts");
  await expect(page.getByText("£10,524.15").first().or(page.getByRole("heading").first())).toBeVisible();
  await page.reload();
  await authenticated(page, "/accounts");
  for (const path of ["/transactions", "/transfers", "/investments", "/settings"]) { await page.goto(`${APP}${path}`); await authenticated(page, path); }

  expect(authHops.length, "no new authorization request after the first sign-in").toBe(afterLogin);
  expect(apiStatuses.length).toBeGreaterThan(0);
  expect(apiStatuses.every(s => s === 200), `API statuses ${apiStatuses} ${authFailures}`).toBe(true);
  expect(authFailures, "the API accepted the Keycloak token on every page").toEqual([]);
});

test("every supported returnTo is honoured; later visits are single sign-on (no credentials requested)", async ({ page }) => {
  await signInTo(page, "/login?returnTo=%2Fdashboard".replace(/^/, "")); // credentials once
  await expect(page).toHaveURL(`${APP}/`, { timeout: 30_000 });      // /dashboard maps to the dashboard home
  for (const path of ["/cards", "/accounts", "/transactions", "/transfers", "/investments", "/settings"]) {
    await page.goto(`${APP}/login?returnTo=${encodeURIComponent(path)}`);
    await expect(page).toHaveURL(`${APP}${path}`, { timeout: 30_000 });
    await expect(page.locator("input[type=password]")).toHaveCount(0);
  }
});

test("unsafe returnTo values never leave the application", async ({ browser }) => {
  const evil = ["//evil.example/steal", "https://evil.example", "/\\evil.example", "javascript:alert(1)", "/login", "/auth/callback", "/../../etc/passwd", "/unknown-area"];
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${APP}/login?returnTo=${encodeURIComponent(evil[0])}`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await submitCredentials(page);
  await expect(page).toHaveURL(`${APP}/`, { timeout: 30_000 });
  for (const value of evil.slice(1)) {
    await page.goto(`${APP}/login?returnTo=${encodeURIComponent(value)}`);
    await page.waitForURL(u => u.origin === APP && !u.pathname.startsWith("/login") && !u.pathname.startsWith("/auth"), { timeout: 30_000 });
    expect(new URL(page.url()).origin, value).toBe(APP);
    expect(page.url(), value).toBe(`${APP}/`);
  }
  await context.close();
});

test("invalid credentials show a generic Keycloak error and allow retry (still one form)", async ({ page }) => {
  await page.goto(`${APP}/login`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await submitCredentials(page, "wrong-password");
  await expect(page.getByText("Incorrect email address, username or password.")).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(1);
  await submitCredentials(page);
  await authenticated(page, "/");
});

test("password visibility toggle works", async ({ page }) => {
  await page.goto(`${APP}/login`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await page.locator("#password").fill("secret");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "password");
});

test("sign out ends the application and Keycloak sessions", async ({ page }) => {
  await signInTo(page, "/cards");
  await authenticated(page, "/cards");
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(`${APP}/login?signedOut=1`, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "You've been signed out" })).toBeVisible();
  await expect(page.locator("input")).toHaveCount(0); // no FINIX credential form
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith("oidc.user")))).toEqual([]);
  // Protected pages are closed again and Keycloak asks for credentials (SSO session is gone).
  await page.goto(`${APP}/cards`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await expect(page.locator("#password")).toBeVisible();
});

test("expired application session renews silently while the SSO session lives; asks to sign in once it has ended", async ({ page }) => {
  await signInTo(page, "/cards");
  await authenticated(page, "/cards");
  const expireLocalUser = () => page.evaluate(() => {
    for (const k of Object.keys(sessionStorage)) {
      if (!k.startsWith("oidc.user:")) continue;
      const u = JSON.parse(sessionStorage.getItem(k)!); u.expires_at = Math.floor(Date.now() / 1000) - 10; delete u.refresh_token;
      sessionStorage.setItem(k, JSON.stringify(u));
    }
  });
  await expireLocalUser();
  await page.goto(`${APP}/cards`);
  await authenticated(page, "/cards"); // SSO cookie => no credentials needed

  await page.context().clearCookies(); // SSO session over
  await expireLocalUser();
  await page.goto(`${APP}/cards`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await expect(page.locator("#password")).toBeVisible();
});

test("callback with an unknown state (stale/foreign attempt) shows the expired state, never auto-restarts", async ({ page }) => {
  const authHops = trackAuthRequests(page);
  await page.goto(`${APP}/auth/callback?code=bogus&state=bogus`);
  await expect(page).toHaveURL(/\/login\?error=timeout/);
  const alert = page.getByRole("alert").filter({ hasText: "Your sign-in session has expired" });
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText(/state|token|exception|8081|keycloak/i);
  await expect(page.locator("input")).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(authHops, "no automatic bounce back to Keycloak").toEqual([]);
  await expect(page.getByRole("link", { name: "Back to FINIX" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try signing in again" })).toBeEnabled();
});

test("expired login attempt: Keycloak hands back to FINIX, retry starts a NEW request, credentials entered once, returnTo kept", async ({ page, request }) => {
  const restore = await setRealm(request, { accessCodeLifespanLogin: 3 });
  try {
    await page.goto(`${APP}/login?returnTo=%2Fcards`);
    await page.waitForURL(`${KEYCLOAK}/**`);
    const first = new URL(page.url()).searchParams;
    await page.waitForTimeout(5000); // the login page outlives the (shortened) login timeout
    await submitCredentials(page);
    await expect(page).toHaveURL(/\/login\?error=timeout/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Unable to sign in" })).toBeVisible();
    await expect(page.getByText("Your sign-in session has expired. Please try again.")).toBeVisible();
    await restore(); // the customer retries after the problem is gone
    await page.getByRole("button", { name: "Try signing in again" }).click();
    await page.waitForURL(`${KEYCLOAK}/**`);
    const second = new URL(page.url()).searchParams;
    for (const k of ["state", "nonce", "code_challenge"]) expect(second.get(k), k).not.toBe(first.get(k));
    await expect(page.locator("input[type=password]")).toHaveCount(1);
    await submitCredentials(page);
    await authenticated(page, "/cards");
  } finally { await restore(); }
});

test("two tabs: the second attempt completes through SSO without asking for credentials again", async ({ context }) => {
  const a = await context.newPage(); const b = await context.newPage();
  for (const p of [a, b]) { await p.goto(`${APP}/login?returnTo=%2Fcards`); await p.waitForURL(`${KEYCLOAK}/**`); }
  await submitCredentials(a);
  await authenticated(a, "/cards");
  await b.locator("#username").fill(USER.username).catch(() => undefined);
  await authenticated(b, "/cards");
  await expect(b.locator("input[type=password]")).toHaveCount(0);
});

test("missing cookies: calm Keycloak message, nothing signs in; a fresh attempt then works", async ({ page, context }) => {
  await page.goto(`${APP}/login`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await context.clearCookies();
  await submitCredentials(page);
  await expect(page.getByText(/Cookie not found/i).first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`^${KEYCLOAK}`));
  await page.goto(`${APP}/login`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await submitCredentials(page);
  await authenticated(page, "/");
});

test("token endpoint enforces PKCE, single use and code expiry", async ({ browser, request }) => {
  const { createHash, randomBytes } = await import("node:crypto");
  /** Runs a real browser login with our own PKCE pair and returns the authorization code without letting FINIX consume it. */
  async function authorizationCode(verifier: string) {
    const context = await browser.newContext(); const page = await context.newPage();
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    let location = "";
    await page.route(/login-actions\/authenticate/, async route => {
      if (route.request().method() !== "POST") return route.continue();
      const res = await route.fetch({ maxRedirects: 0 });
      location = res.headers()["location"] ?? "";
      await route.fulfill({ status: 200, contentType: "text/html", body: "<p>captured</p>" });
    });
    const q = new URLSearchParams({ client_id: "finix-web", response_type: "code", scope: "openid", redirect_uri: `${APP}/auth/callback`, state: "s", code_challenge: challenge, code_challenge_method: "S256" });
    await page.goto(`${KEYCLOAK}${AUTH_ENDPOINT}?${q}`);
    await submitCredentials(page);
    await expect.poll(() => location, { timeout: 15_000 }).not.toBe("");
    await context.close();
    return new URL(location).searchParams.get("code")!;
  }
  const exchange = (code: string, verifier: string) => request.post(`${KEYCLOAK}/realms/finix/protocol/openid-connect/token`, { form: { grant_type: "authorization_code", client_id: "finix-web", redirect_uri: `${APP}/auth/callback`, code, code_verifier: verifier } });
  const verifier = randomBytes(48).toString("base64url");

  let code = await authorizationCode(verifier);
  const wrong = await exchange(code, randomBytes(48).toString("base64url"));
  expect(wrong.status(), "wrong PKCE verifier").toBe(400);
  expect((await wrong.json()).error).toBe("invalid_grant");

  code = await authorizationCode(verifier);
  const ok = await exchange(code, verifier);
  expect(ok.status(), "correct verifier").toBe(200);
  expect(Object.keys(await ok.json())).toContain("access_token");
  expect((await exchange(code, verifier)).status(), "replayed code").toBe(400);

  const restore = await setRealm(request, { accessCodeLifespan: 1 });
  try {
    code = await authorizationCode(verifier);
    await new Promise(r => setTimeout(r, 2500));
    expect((await exchange(code, verifier)).status(), "expired code").toBe(400);
  } finally { await restore(); }
});

test("Keycloak unavailable: friendly error, nothing sensitive, retry possible", async ({ page }) => {
  await page.route(`${KEYCLOAK}/realms/finix/.well-known/**`, r => r.abort());
  await page.goto(`${APP}/cards`);
  const alert = page.getByRole("alert").filter({ hasText: "unable to sign you in right now" });
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText(/8081|keycloak|ECONN|fetch/i);
  await page.unroute(`${KEYCLOAK}/realms/finix/.well-known/**`);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.waitForURL(`${KEYCLOAK}/**`);
});

test("backend rejecting a valid-looking token ends the session without looping into Keycloak", async ({ page }) => {
  await signInTo(page, "/cards");
  await authenticated(page, "/cards");
  const authHops = trackAuthRequests(page);
  await page.route(`${API}/api/**`, r => r.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.goto(`${APP}/accounts`, { waitUntil: "commit" }).catch(() => undefined); // the app redirects while loading
  await expect(page).toHaveURL(/\/login\?.*error=expired/, { timeout: 30_000 });
  await expect(page.getByRole("alert").filter({ hasText: "session has ended" })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(authHops).toEqual([]);
});

test("API rejects unauthenticated, malformed and foreign-issuer tokens", async ({ request }) => {
  for (const path of ["/api/dashboard", "/api/accounts", "/api/transactions", "/api/transfers", "/api/cards"]) {
    expect((await request.get(`${API}${path}`)).status(), `${path} anonymous`).toBe(401);
    expect((await request.get(`${API}${path}`, { headers: { Authorization: "Bearer not-a-jwt" } })).status(), `${path} garbage`).toBe(401);
  }
  const forged = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: "x", iss: `${KEYCLOAK}/realms/finix`, aud: "finix-api", azp: "finix-web", exp: 4102444800 })).toString("base64url")}.`;
  expect((await request.get(`${API}/api/accounts`, { headers: { Authorization: `Bearer ${forged}` } })).status()).toBe(401);
});

test("signed-out visitors cannot see banking pages or call the API from the UI", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", r => { if (r.url().startsWith(`${API}/api/`)) apiCalls.push(r.url()); });
  await page.goto(`${APP}/transactions`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  expect(apiCalls).toEqual([]);
});
