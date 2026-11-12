import { test, expect, type Page } from "@playwright/test";

/**
 * Development demo sign-in (demo@gmail.com). Runs against a dev server started with FINIX_DEMO_AUTH=true (port 3200).
 * The production build (Docker, :3000) and a plain dev server (:3100) must refuse it entirely.
 */
const DEMO = "http://localhost:3200";
const PROD = "http://localhost:3000";
const PLAIN_DEV = "http://127.0.0.1:3100";
const API = "http://localhost:8080";
const CREDENTIALS = { email: "demo@gmail.com", password: "123abc" };

test.describe.configure({ mode: "serial", timeout: 90_000 });
test.use({ actionTimeout: 20_000 });

async function signIn(page: Page, returnTo?: string) {
  await page.goto("about:blank"); // settle any navigation still in flight from the previous step
  await page.goto(`${DEMO}/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
  // wait until React has attached to the form (a click before hydration would do a native submit)
  await page.waitForFunction(() => { const f = document.querySelector("form[aria-label='Demo sign in']"); return !!f && Object.keys(f).some(k => k.startsWith("__reactProps")); });
  await page.getByLabel("Email address").fill(CREDENTIALS.email);
  await page.getByLabel("Password", { exact: true }).fill(CREDENTIALS.password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

test("demo@gmail.com / 123abc signs in, lands on the dashboard and shows only fictional Demo User data", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", r => { if (r.url().startsWith(`${API}/api/`)) apiCalls.push(r.url()); });
  await page.goto(`${DEMO}/login`);
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await expect(page.getByRole("note", { name: "Development demo" })).toContainText("Demo mode uses fictional banking data. No real financial transactions are available.");
  await page.getByLabel("Email address").fill(CREDENTIALS.email);
  await page.getByLabel("Password", { exact: true }).fill(CREDENTIALS.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(`${DEMO}/`, { timeout: 30_000 }); // /dashboard -> dashboard home
  const main = page.locator("main");
  await expect(main.getByRole("note", { name: "Development demo" })).toBeVisible();         // indicator stays after sign-in
  await expect(main.getByText("Demo mode uses fictional banking data. No real financial transactions are available.")).toBeVisible();
  await expect(main.getByText("•••• 4568").first()).toBeVisible();
  await expect(main.getByText("•••• 0958").first()).toBeVisible();
  const text = await main.innerText();
  expect(text).not.toContain("Alex Morgan");
  // (the static sample numbers are the same fictional preview data as the signed-out view; isolation is proven by the zero API calls below)
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.getByText("Demo User").first()).toBeVisible();
  await expect(page.getByText("demo@gmail.com")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto(`${DEMO}/cards`); await expect(page.getByRole("note", { name: "Development demo" })).toBeVisible();
  expect(apiCalls, "a demo session never calls the banking API").toEqual([]);
});

test("incorrect credentials are rejected with one generic message", async ({ page }) => {
  for (const [email, password] of [["demo@gmail.com", "wrong"], ["someone@gmail.com", "123abc"], ["alex", "DemoPass123!"]]) {
    await page.goto(`${DEMO}/login`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Incorrect email address or password." })).toBeVisible();
    expect(page.url()).toContain("/login");
  }
  await page.goto(`${DEMO}/login`);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  expect((await page.context().cookies()).filter(c => c.name === "finix_demo")).toEqual([]);
});

test("returnTo is honoured when safe and ignored when not", async ({ page }) => {
  await signIn(page, "/cards");
  await expect(page).toHaveURL(`${DEMO}/cards`, { timeout: 30_000 });
  await page.context().clearCookies();
  for (const bad of ["//evil.example", "https://evil.example", "/\\evil.example", "javascript:alert(1)", "/unknown-area"]) {
    await signIn(page, bad);
    await expect(page).toHaveURL(`${DEMO}/`, { timeout: 30_000 });
    await page.context().clearCookies();
  }
});

test("session cookie is signed, HttpOnly and SameSite=Strict; nothing is stored in the browser; the bundle holds no password", async ({ page, context }) => {
  const scripts: string[] = [];
  page.on("response", r => { if (r.url().includes("/_next/static/") && r.url().endsWith(".js")) scripts.push(r.url()); });
  await signIn(page);
  await expect(page).toHaveURL(`${DEMO}/`, { timeout: 30_000 });
  const cookie = (await context.cookies()).find(c => c.name === "finix_demo")!;
  expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe("Strict");
  expect(await page.evaluate(() => document.cookie)).not.toContain("finix_demo");
  const stored = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
  expect(stored).not.toMatch(/123abc|password|demo@gmail/i);
  expect(stored).not.toContain("oidc.user");                                                // no fake Keycloak token
  let leaks = 0;
  for (const url of new Set(scripts)) { const body = await (await page.request.get(url)).text(); if (body.includes("123abc") || body.includes("dd130a849d7b29e5541b05d2f7f86a4acd4f1ec598c1c9438783f56bc4f0ff80")) leaks++; }
  expect(scripts.length).toBeGreaterThan(0); expect(leaks, "demo password (or its digest) must not be in any client bundle").toBe(0);
  // a forged / tampered cookie is not a session
  await context.addCookies([{ name: "finix_demo", value: "eyJzdWIiOiJkZW1vIn0.forged", url: DEMO, httpOnly: true, sameSite: "Strict" }]);
  expect((await page.request.get(`${DEMO}/api/demo/session`)).status()).toBe(401);
  await page.goto(`${DEMO}/cards`);
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
});

test("a demo session cannot reach the protected banking API and never becomes a Keycloak session", async ({ page, context }) => {
  await signIn(page);
  await expect(page).toHaveURL(`${DEMO}/`, { timeout: 30_000 });
  // the cookie is even sent to :8080 (cookies ignore ports): Spring Security still treats the request as anonymous
  for (const path of ["/api/accounts", "/api/dashboard", "/api/transactions", "/api/cards"]) {
    expect((await context.request.get(`${API}${path}`)).status(), path).toBe(401);
  }
  expect((await context.request.post(`${API}/api/transfers`, { data: { sourceAccountId: "x", destinationAccountId: "y", amountMinor: 1, description: "x" }, headers: { "Idempotency-Key": "demo-1" } })).status()).toBe(401);
  expect((await context.request.post(`${API}/api/cards`, { data: { accountId: "x", cardType: "EVERYDAY" } })).status()).toBe(401);
});

test("sign out clears the demo session", async ({ page, context }) => {
  await signIn(page);
  await expect(page).toHaveURL(`${DEMO}/`, { timeout: 30_000 });
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(`${DEMO}/login?signedOut=1`, { timeout: 30_000 });
  expect((await context.cookies()).filter(c => c.name === "finix_demo")).toEqual([]);
  expect((await page.request.get(`${DEMO}/api/demo/session`)).status()).toBe(401);
  await page.goto(`${DEMO}/transactions`);
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.getByRole("note", { name: "Development demo" })).toBeVisible(); // login page, not the app
});

test("Keycloak sign-in is still offered, and the password toggle works", async ({ page }) => {
  await page.goto(`${DEMO}/login`);
  await expect(page.getByRole("button", { name: "Continue with secure sign-in" })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("secret");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
});

test("demo sign-in does not exist in a production build or a dev server without the opt-in", async ({ request }) => {
  for (const base of [PROD, PLAIN_DEV]) {
    const login = await request.post(`${base}/api/demo/login`, { data: CREDENTIALS });
    expect(login.status(), `${base} login`).toBe(404);
    expect((await request.get(`${base}/api/demo/session`)).status(), `${base} session`).toBe(404);
    expect((await request.post(`${base}/api/demo/logout`)).status(), `${base} logout`).toBe(404);
  }
});

test("production login page offers Keycloak only: no demo form", async ({ page }) => {
  await page.goto(`${PROD}/login`);
  await page.waitForURL(/localhost:8081/);   // straight to Keycloak
  await expect(page.getByText("Development Demo")).toHaveCount(0);
});

for (const [name, width, height] of [["mobile", 390, 844], ["tablet", 820, 1180], ["desktop", 1440, 900], ["wide", 1920, 1080]] as const) {
  test(`demo sign-in layout (${name} ${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`${DEMO}/login`);
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    for (const label of ["Email address", "Password"]) { const b = (await page.getByLabel(label, { exact: true }).boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(width); expect(b.height).toBeGreaterThanOrEqual(44); }
    const btn = (await page.getByRole("button", { name: "Sign In" }).boundingBox())!; expect(btn.height).toBeGreaterThanOrEqual(44);
    const aside = page.getByRole("complementary", { name: "About FINIX" });
    if (width >= 1024) { const a = (await aside.boundingBox())!, f = (await page.locator("main#signin").boundingBox())!; expect(Math.abs(a.width - f.width), "50/50").toBeLessThanOrEqual(2); }
    else if (width < 640) await expect(aside).toBeHidden();
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
    await page.screenshot({ path: `/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/demo-${name}.png` });
  });
}
