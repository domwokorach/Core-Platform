import { test, expect, type Page } from "@playwright/test";

/**
 * Self-registration through the FINIX-themed Keycloak page, end to end: /register -> Keycloak -> verification email (Mailpit)
 * -> verified sign-in -> FINIX dashboard with an empty, private profile. Requires the dev stack (Keycloak, API, Mailpit :8025).
 */
const APP = "http://localhost:3000";
const KEYCLOAK = "http://localhost:8081";
const API = "http://localhost:8080";
const MAIL = "http://localhost:8025";
const PASSWORD = "Correct-horse-battery-9";

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.use({ actionTimeout: 20_000 });
test.beforeAll(async ({ request }) => {
  const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
  const mail = await request.get(`${MAIL}/api/v1/messages?limit=1`, { timeout: 5000 }).then(r => r.ok(), () => false);
  test.skip(!up || !mail, "Keycloak and Mailpit must be running");
});

const unique = () => `reg-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

async function openRegistration(page: Page, returnTo?: string) {
  await page.goto(`${APP}/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await expect(page.getByRole("heading", { name: "Create your FINIX account" })).toBeVisible();
}
async function fill(page: Page, v: { first?: string; last?: string; email: string; password?: string; confirm?: string; terms?: boolean }) {
  await page.getByLabel("First name").fill(v.first ?? "Nia");
  await page.getByLabel("Last name").fill(v.last ?? "Okafor");
  await page.getByLabel("Email address").fill(v.email);
  await page.locator("#password").fill(v.password ?? PASSWORD);
  await page.locator("#password-confirm").fill(v.confirm ?? v.password ?? PASSWORD);
  if (v.terms !== false) await page.getByLabel(/I agree to the/).check();
}
async function verificationLink(request: import("@playwright/test").APIRequestContext, email: string) {
  for (let i = 0; i < 30; i++) {
    const list = await (await request.get(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    // the original message: a later sign-in attempt by the unverified user sends another one for a different browser session
    const id = list.messages?.[list.messages.length - 1]?.ID;
    if (id) {
      const msg = await (await request.get(`${MAIL}/api/v1/message/${id}`)).json();
      const m = /https?:\/\/localhost:8081[^\s"<>]*action-token[^\s"<>]*/.exec(`${msg.Text ?? ""} ${msg.HTML ?? ""}`);
      if (m) return m[0].replace(/&amp;/g, "&");
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("verification email did not arrive");
}

for (const width of [375, 390, 430, 768, 1024, 1440, 1920]) {
  test(`registration layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await openRegistration(page);
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "no horizontal overflow").toBeLessThanOrEqual(0);
    const hero = (await page.locator(".finix-hero").boundingBox())!, panel = (await page.locator(".finix-panel").boundingBox())!;
    for (const label of ["First name", "Last name", "Email address"]) await expect(page.getByLabel(label)).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#password-confirm")).toBeVisible();
    for (const sel of ["#firstName", "#lastName", "#email", "#password", "#password-confirm", "#kc-register"]) {
      const box = (await page.locator(sel).boundingBox())!;
      expect(box.x, sel).toBeGreaterThanOrEqual(0); expect(box.x + box.width, sel).toBeLessThanOrEqual(width);
      expect(box.height, sel).toBeGreaterThanOrEqual(44);
    }
    if (width >= 768) { expect(Math.abs(hero.width - panel.width)).toBeLessThanOrEqual(1); }
    else { expect(panel.y).toBeGreaterThanOrEqual(hero.y + hero.height - 1); await expect(page.locator(".hero-art")).toBeHidden(); }
    if (width >= 1024) await expect(page.locator(".hero-art")).toBeVisible();
    await page.screenshot({ path: `/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/register-${width}.png`, fullPage: true });
  });
}

test("client-side validation, password toggles, strength guidance and legal links", async ({ page, context }) => {
  await openRegistration(page);
  await page.getByRole("button", { name: "Create Account" }).click();
  for (const text of ["Enter your first name.", "Enter your last name.", "Enter a valid email address.", "Password must be at least 10 characters.", "Please agree to the Terms of Service and Privacy Policy to continue."])
    await expect(page.getByText(text).first()).toBeVisible();
  expect(page.url()).toContain(KEYCLOAK);
  await expect(page.locator("#terms\\Accepted, #termsAccepted")).not.toBeChecked(); // consent is never pre-checked
  await page.getByLabel("Email address").fill("not-an-email"); await page.getByLabel("Last name").click();
  await expect(page.getByText("Enter a valid email address.").first()).toBeVisible();
  await page.locator("#password").fill("short"); await page.locator("#password").blur();
  await expect(page.getByText("Password must be at least 10 characters.").first()).toBeVisible();
  await page.locator("#password").fill(PASSWORD);
  await expect(page.locator(".finix-meter")).toHaveAttribute("data-level", /[34]/);
  await page.locator("#password-confirm").fill("Different-password-1"); await page.locator("#password-confirm").blur();
  await expect(page.getByText("Passwords don't match.")).toBeVisible();
  await page.locator("#password-confirm").fill(PASSWORD);
  await expect(page.getByText("Passwords don't match.")).toHaveCount(0);
  await expect(page.getByLabel("Email address")).toHaveAttribute("autocomplete", "email");
  await expect(page.locator("#password")).toHaveAttribute("autocomplete", "new-password");
  const toggles = page.getByRole("button", { name: "Show password" });
  await expect(toggles).toHaveCount(2);
  await toggles.first().click(); await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await expect(page.locator("#password-confirm")).toHaveAttribute("type", "password");
  // Terms and Privacy open without authentication
  for (const [name, path] of [["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"]] as const) {
    const link = page.locator(".finix-terms").getByRole("link", { name });
    await expect(link).toHaveAttribute("href", `${APP}${path}`);
    const popup = context.waitForEvent("page"); await link.click(); const p = await popup;
    await p.waitForLoadState(); expect(p.url()).toBe(`${APP}${path}`); await expect(p.getByRole("heading", { level: 1 })).toBeVisible(); await p.close();
  }
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("terms acceptance is enforced by the server, not just the page", async ({ page }) => {
  await openRegistration(page);
  await fill(page, { email: unique(), terms: false });
  await page.evaluate(() => (document.getElementById("kc-register-form") as HTMLFormElement).submit()); // bypasses every client-side handler
  await expect(page.getByText("Please agree to the Terms of Service and Privacy Policy to continue.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create your FINIX account" })).toBeVisible();
});

test("weak password is rejected by the Keycloak policy", async ({ page }) => {
  await openRegistration(page);
  await fill(page, { email: unique(), password: "Abcdef1!x", confirm: "Abcdef1!x" });
  await page.evaluate(() => (document.getElementById("kc-register-form") as HTMLFormElement).submit());
  await expect(page.locator(".finix-error").filter({ hasText: /at least 10 characters/i })).toBeVisible();
});

test("register, verify by email, sign in once, land on the dashboard with a private empty profile; re-login and duplicates behave", async ({ page, browser, request }) => {
  const email = unique();
  await openRegistration(page, "/cards");
  await fill(page, { email });
  const busy: string[] = [];
  await page.getByRole("button", { name: "Create Account" }).click();

  // Verification is required: success is only reported once Keycloak confirms the email action.
  await expect(page.getByRole("heading", { name: "Verify your email address" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  expect(page.url()).toContain(KEYCLOAK);

  // An unverified identity cannot get into FINIX: a fresh sign-in attempt stops at the verification step.
  const other = await (await browser.newContext()).newPage();
  await other.goto(`${APP}/login?returnTo=%2Fcards`); await other.waitForURL(`${KEYCLOAK}/**`);
  await other.locator("#username").fill(email); await other.locator("#password").fill(PASSWORD); await other.locator("#kc-login").click();
  await expect(other.getByRole("heading", { name: "Verify your email address" })).toBeVisible();
  expect(other.url().startsWith(APP)).toBe(false);
  await other.context().close();

  // Open the emailed link: verified, and the original sign-in completes -> back to the requested page.
  const link = await verificationLink(request, email);
  await page.goto(link);
  await expect(page).toHaveURL(new RegExp(`^${APP}/(cards)?`), { timeout: 40_000 });
  await expect(page.getByRole("button", { name: "Open profile menu" })).toBeVisible({ timeout: 30_000 });
  void busy;

  // Real JWT, real API: a profile exists, owns nothing, and sees none of the seeded customer's accounts.
  const token = await page.evaluate(() => { const k = Object.keys(sessionStorage).find(x => x.startsWith("oidc.user:"))!; return JSON.parse(sessionStorage.getItem(k)!).access_token as string; });
  const headers = { Authorization: `Bearer ${token}` };
  for (let i = 0; i < 3; i++) { const r = await request.get(`${API}/api/accounts`, { headers }); expect(r.status()).toBe(200); expect(await r.json()).toEqual([]); }
  const dash = await request.get(`${API}/api/dashboard`, { headers }); expect(dash.status()).toBe(200);
  expect(JSON.stringify(await dash.json())).not.toContain("10,524"); // nothing of the demo customer
  expect((await request.get(`${API}/api/cards`, { headers })).status()).toBe(200);

  // Sign out, then sign in again with the new identity: one credential entry, same profile.
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(`${APP}/login?signedOut=1`, { timeout: 30_000 });
  await page.goto(`${APP}/cards`); await page.waitForURL(`${KEYCLOAK}/**`);
  await expect(page.locator("input[type=password]")).toHaveCount(1);
  await page.locator("#username").fill(email); await page.locator("#password").fill(PASSWORD); await page.locator("#kc-login").click();
  await expect(page).toHaveURL(`${APP}/cards`, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Open profile menu" })).toBeVisible();

  // Registering the same email again is refused with a calm message.
  const again = await (await browser.newContext()).newPage();
  await openRegistration(again);
  await fill(again, { email });
  await again.getByRole("button", { name: "Create Account" }).click();
  await expect(again.getByText(/already exists/i).first()).toBeVisible();
  await again.context().close();
});

test("a tampered or expired verification link shows a friendly, themed error with a way back", async ({ page, request }) => {
  const email = unique();
  await openRegistration(page);
  await fill(page, { email });
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByRole("heading", { name: "Verify your email address" })).toBeVisible();
  const link = await verificationLink(request, email);
  const broken = link.replace(/key=[^&]+/, "key=" + "x".repeat(20));
  await page.goto(broken === link ? link.slice(0, -6) : broken);
  await expect(page.locator(".finix-hero")).toBeVisible();
  await expect(page.locator("#kc-error-message, #kc-info-message").first()).toBeVisible();
  await expect(page.getByText(/expired|invalid|error occurred|login again/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to FINIX" })).toBeVisible();
});

test("identity provider unavailable on /register: friendly message and a retry", async ({ page }) => {
  await page.route(`${KEYCLOAK}/realms/finix/.well-known/**`, r => r.abort());
  await page.goto(`${APP}/register`);
  const alert = page.getByRole("alert").filter({ hasText: /temporarily unavailable|unable to sign you in/i });
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText(/8081|keycloak|fetch|ECONN/i);
  await page.unroute(`${KEYCLOAK}/realms/finix/.well-known/**`);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.waitForURL(`${KEYCLOAK}/**`);
  await expect(page.getByRole("heading", { name: "Create your FINIX account" })).toBeVisible();
});

test("the sign-in page links to registration and back, and existing sign-in still works", async ({ page }) => {
  await page.goto(`${APP}/login?returnTo=%2Ftransactions`); await page.waitForURL(`${KEYCLOAK}/**`);
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your FINIX account" })).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await page.locator("#username").fill("alex"); await page.locator("#password").fill("DemoPass123!"); await page.locator("#kc-login").click();
  await expect(page).toHaveURL(`${APP}/transactions`, { timeout: 30_000 });
});
