# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-register.spec.ts >> registration layout at 375px
- Location: tests/auth-register.spec.ts:52:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Create your FINIX account' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Create your FINIX account' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Create your FINIX account' })

```

```yaml
- complementary "About FINIX":
  - link "FINIX home":
    - /url: http://localhost:3000
    - text: FINIX
  - heading "Banking made beautifully simple." [level=2]
  - paragraph: Your finances, beautifully organised. Experience effortless control, real-time insights and a smarter way to manage your money.
- main:
  - paragraph: Welcome back
  - heading "FINIX — Core Banking" [level=1]
  - paragraph: Join FINIX and start managing your financial world with confidence.
  - text: First name
  - textbox "First name"
  - text: Last name
  - textbox "Last name"
  - text: Email address
  - textbox "Email address"
  - text: Password
  - textbox "Password"
  - button "Show password"
  - paragraph: Use at least 10 characters. A longer phrase is stronger.
  - text: Confirm password
  - textbox "Confirm password"
  - button "Show password"
  - checkbox "I agree to the Terms of Service and Privacy Policy."
  - text: I agree to the
  - link "Terms of Service":
    - /url: http://localhost:3000/terms
  - text: and
  - link "Privacy Policy":
    - /url: http://localhost:3000/privacy
  - text: .
  - button "Create Account"
  - paragraph:
    - text: Already have an account?
    - link "Sign in":
      - /url: /realms/finix/login-actions/authenticate?client_id=finix-web&tab_id=0vzcBZrS7TU&client_data=eyJydSI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2NhbGxiYWNrIiwicnQiOiJjb2RlIiwic3QiOiI0ODEyZTc4ZTJkMzE0NWYxOGFiMjgzOTc0NWYwYTVhMSJ9
  - paragraph: Your password is only ever entered on this secure FINIX page.
  - navigation "Legal":
    - text: © FINIX
    - link "Privacy Policy":
      - /url: http://localhost:3000/privacy
    - link "Terms of Service":
      - /url: http://localhost:3000/terms
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | /**
  4   |  * Self-registration through the FINIX-themed Keycloak page, end to end: /register -> Keycloak -> verification email (Mailpit)
  5   |  * -> verified sign-in -> FINIX dashboard with an empty, private profile. Requires the dev stack (Keycloak, API, Mailpit :8025).
  6   |  */
  7   | const APP = "http://localhost:3000";
  8   | const KEYCLOAK = "http://localhost:8081";
  9   | const API = "http://localhost:8080";
  10  | const MAIL = "http://localhost:8025";
  11  | const PASSWORD = "Correct-horse-battery-9";
  12  | 
  13  | test.describe.configure({ mode: "serial", timeout: 120_000 });
  14  | test.use({ actionTimeout: 20_000 });
  15  | test.beforeAll(async ({ request }) => {
  16  |   const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
  17  |   const mail = await request.get(`${MAIL}/api/v1/messages?limit=1`, { timeout: 5000 }).then(r => r.ok(), () => false);
  18  |   test.skip(!up || !mail, "Keycloak and Mailpit must be running");
  19  | });
  20  | 
  21  | const unique = () => `reg-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
  22  | 
  23  | async function openRegistration(page: Page, returnTo?: string) {
  24  |   await page.goto(`${APP}/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
  25  |   await page.waitForURL(`${KEYCLOAK}/**`);
> 26  |   await expect(page.getByRole("heading", { name: "Create your FINIX account" })).toBeVisible();
      |                                                                                  ^ Error: expect(locator).toBeVisible() failed
  27  | }
  28  | async function fill(page: Page, v: { first?: string; last?: string; email: string; password?: string; confirm?: string; terms?: boolean }) {
  29  |   await page.getByLabel("First name").fill(v.first ?? "Nia");
  30  |   await page.getByLabel("Last name").fill(v.last ?? "Okafor");
  31  |   await page.getByLabel("Email address").fill(v.email);
  32  |   await page.locator("#password").fill(v.password ?? PASSWORD);
  33  |   await page.locator("#password-confirm").fill(v.confirm ?? v.password ?? PASSWORD);
  34  |   if (v.terms !== false) await page.getByLabel(/I agree to the/).check();
  35  | }
  36  | async function verificationLink(request: import("@playwright/test").APIRequestContext, email: string) {
  37  |   for (let i = 0; i < 30; i++) {
  38  |     const list = await (await request.get(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
  39  |     // the original message: a later sign-in attempt by the unverified user sends another one for a different browser session
  40  |     const id = list.messages?.[list.messages.length - 1]?.ID;
  41  |     if (id) {
  42  |       const msg = await (await request.get(`${MAIL}/api/v1/message/${id}`)).json();
  43  |       const m = /https?:\/\/localhost:8081[^\s"<>]*action-token[^\s"<>]*/.exec(`${msg.Text ?? ""} ${msg.HTML ?? ""}`);
  44  |       if (m) return m[0].replace(/&amp;/g, "&");
  45  |     }
  46  |     await new Promise(r => setTimeout(r, 500));
  47  |   }
  48  |   throw new Error("verification email did not arrive");
  49  | }
  50  | 
  51  | for (const width of [375, 390, 430, 768, 1024, 1440, 1920]) {
  52  |   test(`registration layout at ${width}px`, async ({ page }) => {
  53  |     await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
  54  |     await openRegistration(page);
  55  |     await page.waitForTimeout(900);
  56  |     expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "no horizontal overflow").toBeLessThanOrEqual(0);
  57  |     const hero = (await page.locator(".finix-hero").boundingBox())!, panel = (await page.locator(".finix-panel").boundingBox())!;
  58  |     for (const label of ["First name", "Last name", "Email address"]) await expect(page.getByLabel(label)).toBeVisible();
  59  |     await expect(page.locator("#password")).toBeVisible();
  60  |     await expect(page.locator("#password-confirm")).toBeVisible();
  61  |     for (const sel of ["#firstName", "#lastName", "#email", "#password", "#password-confirm", "#kc-register"]) {
  62  |       const box = (await page.locator(sel).boundingBox())!;
  63  |       expect(box.x, sel).toBeGreaterThanOrEqual(0); expect(box.x + box.width, sel).toBeLessThanOrEqual(width);
  64  |       expect(box.height, sel).toBeGreaterThanOrEqual(44);
  65  |     }
  66  |     if (width >= 768) { expect(Math.abs(hero.width - panel.width)).toBeLessThanOrEqual(1); }
  67  |     else { expect(panel.y).toBeGreaterThanOrEqual(hero.y + hero.height - 1); await expect(page.locator(".hero-art")).toBeHidden(); }
  68  |     if (width >= 1024) await expect(page.locator(".hero-art")).toBeVisible();
  69  |     await page.screenshot({ path: `/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/register-${width}.png`, fullPage: true });
  70  |   });
  71  | }
  72  | 
  73  | test("client-side validation, password toggles, strength guidance and legal links", async ({ page, context }) => {
  74  |   await openRegistration(page);
  75  |   await page.getByRole("button", { name: "Create Account" }).click();
  76  |   for (const text of ["Enter your first name.", "Enter your last name.", "Enter a valid email address.", "Password must be at least 10 characters.", "Please agree to the Terms of Service and Privacy Policy to continue."])
  77  |     await expect(page.getByText(text).first()).toBeVisible();
  78  |   expect(page.url()).toContain(KEYCLOAK);
  79  |   await expect(page.locator("#terms\\Accepted, #termsAccepted")).not.toBeChecked(); // consent is never pre-checked
  80  |   await page.getByLabel("Email address").fill("not-an-email"); await page.getByLabel("Last name").click();
  81  |   await expect(page.getByText("Enter a valid email address.").first()).toBeVisible();
  82  |   await page.locator("#password").fill("short"); await page.locator("#password").blur();
  83  |   await expect(page.getByText("Password must be at least 10 characters.").first()).toBeVisible();
  84  |   await page.locator("#password").fill(PASSWORD);
  85  |   await expect(page.locator(".finix-meter")).toHaveAttribute("data-level", /[34]/);
  86  |   await page.locator("#password-confirm").fill("Different-password-1"); await page.locator("#password-confirm").blur();
  87  |   await expect(page.getByText("Passwords don't match.")).toBeVisible();
  88  |   await page.locator("#password-confirm").fill(PASSWORD);
  89  |   await expect(page.getByText("Passwords don't match.")).toHaveCount(0);
  90  |   await expect(page.getByLabel("Email address")).toHaveAttribute("autocomplete", "email");
  91  |   await expect(page.locator("#password")).toHaveAttribute("autocomplete", "new-password");
  92  |   const toggles = page.getByRole("button", { name: "Show password" });
  93  |   await expect(toggles).toHaveCount(2);
  94  |   await toggles.first().click(); await expect(page.locator("#password")).toHaveAttribute("type", "text");
  95  |   await expect(page.locator("#password-confirm")).toHaveAttribute("type", "password");
  96  |   // Terms and Privacy open without authentication
  97  |   for (const [name, path] of [["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"]] as const) {
  98  |     const link = page.locator(".finix-terms").getByRole("link", { name });
  99  |     await expect(link).toHaveAttribute("href", `${APP}${path}`);
  100 |     const popup = context.waitForEvent("page"); await link.click(); const p = await popup;
  101 |     await p.waitForLoadState(); expect(p.url()).toBe(`${APP}${path}`); await expect(p.getByRole("heading", { level: 1 })).toBeVisible(); await p.close();
  102 |   }
  103 |   await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  104 | });
  105 | 
  106 | test("terms acceptance is enforced by the server, not just the page", async ({ page }) => {
  107 |   await openRegistration(page);
  108 |   await fill(page, { email: unique(), terms: false });
  109 |   await page.evaluate(() => (document.getElementById("kc-register-form") as HTMLFormElement).submit()); // bypasses every client-side handler
  110 |   await expect(page.getByText("Please agree to the Terms of Service and Privacy Policy to continue.")).toBeVisible();
  111 |   await expect(page.getByRole("heading", { name: "Create your FINIX account" })).toBeVisible();
  112 | });
  113 | 
  114 | test("weak password is rejected by the Keycloak policy", async ({ page }) => {
  115 |   await openRegistration(page);
  116 |   await fill(page, { email: unique(), password: "Abcdef1!x", confirm: "Abcdef1!x" });
  117 |   await page.evaluate(() => (document.getElementById("kc-register-form") as HTMLFormElement).submit());
  118 |   await expect(page.locator(".finix-error").filter({ hasText: /at least 10 characters/i })).toBeVisible();
  119 | });
  120 | 
  121 | test("register, verify by email, sign in once, land on the dashboard with a private empty profile; re-login and duplicates behave", async ({ page, browser, request }) => {
  122 |   const email = unique();
  123 |   await openRegistration(page, "/cards");
  124 |   await fill(page, { email });
  125 |   const busy: string[] = [];
  126 |   await page.getByRole("button", { name: "Create Account" }).click();
```