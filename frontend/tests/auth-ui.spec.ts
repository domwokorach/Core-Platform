import { test, expect, type Page } from "@playwright/test";

/** Layout, accessibility and interaction checks for the FINIX-themed Keycloak sign-in (split-screen). */
const APP = "http://localhost:3000";
const KEYCLOAK = "http://localhost:8081";
test.describe.configure({ timeout: 60_000 });
test.beforeAll(async ({ request }) => {
  const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
  test.skip(!up, "Local Keycloak is not running");
});

async function open(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(`${APP}/login?returnTo=%2Fcards`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await expect(page.locator("#username")).toBeVisible();
  await page.waitForTimeout(900); // let entrance animations settle before measuring
}

for (const width of [375, 390, 768, 1024, 1440, 1920]) {
  test(`layout at ${width}px: no overflow, form reachable, correct split`, async ({ page }) => {
    await open(page, width);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "no horizontal overflow").toBeLessThanOrEqual(0);
    const hero = (await page.locator(".finix-hero").boundingBox())!;
    const panel = (await page.locator(".finix-panel").boundingBox())!;
    await expect(page.getByRole("heading", { name: "Banking made beautifully simple." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    if (width >= 768) {
      expect(Math.abs(hero.width - panel.width), "50/50 columns").toBeLessThanOrEqual(1);
      expect(Math.abs(hero.y - panel.y)).toBeLessThanOrEqual(1);
      const card = (await page.locator(".finix-panel-inner").boundingBox())!;
      expect(card.width).toBeLessThanOrEqual(421);
      expect(Math.abs(card.x + card.width / 2 - (panel.x + panel.width / 2)), "form centred in its column").toBeLessThanOrEqual(1);
      const logo = (await page.locator(".finix-brand").boundingBox())!;
      expect(logo.x - hero.x, "logo top-left").toBeLessThan(80); expect(logo.y).toBeLessThan(80);
    } else {
      expect(panel.y, "form stacked below the brand introduction").toBeGreaterThanOrEqual(hero.y + hero.height - 1);
      await expect(page.locator(".hero-art")).toBeHidden();
    }
    for (const sel of ["#username", "#password", "#kc-login"]) {
      const box = (await page.locator(sel).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    if (width >= 1024) await expect(page.locator(".hero-art")).toBeVisible();
    await page.screenshot({ path: `/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/auth-${width}.png` });
  });
}

test("labels, keyboard order, validation, password toggle and links", async ({ page }) => {
  await open(page, 1440);
  await expect(page.getByLabel("Email address or username")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in securely" })).toBeVisible();
  // inline validation, nothing is submitted
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByText("Enter your email address or username.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  await expect(page.locator("#username")).toBeFocused();
  expect(page.url()).toContain(KEYCLOAK);
  // keyboard: username -> password -> toggle -> forgot -> submit
  await page.locator("#username").focus();
  const order: string[] = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); order.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim() || document.activeElement?.tagName || "")); }
  expect(order[0]).toBe("password");
  expect(order[order.length - 1]).toBe("kc-login");
  // toggle
  await page.locator("#password").fill("secret");
  await page.getByRole("button", { name: "Show password" }).press("Enter");
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  // links work
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", `${APP}/privacy`);
  await expect(page.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", `${APP}/terms`);
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByRole("link", { name: /Sign in/ }).click();
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.locator("input[type=password]").first()).toBeVisible();
  await expect(page.locator(".finix-hero")).toBeVisible(); // same split layout on every page
});

test("loading state while authenticating, then returns to /cards", async ({ page }) => {
  await open(page, 1440);
  // The redirect can finish within a frame, so record the button state at submit time (after the page's own handler ran).
  const seen: string[] = [];
  page.on("console", m => { if (m.text().startsWith("busy-state:")) seen.push(m.text()); });
  await page.evaluate(() => document.getElementById("kc-form-login")!.addEventListener("submit", () => {
    const b = document.getElementById("kc-login")!; console.log(`busy-state:${b.getAttribute("aria-busy")}:${b.classList.contains("is-busy")}`);
  }));
  await page.locator("#username").fill("alex");
  await page.locator("#password").fill("DemoPass123!");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(`${APP}/cards`, { timeout: 30_000 });
  expect(seen).toEqual(["busy-state:true:true"]);
});

test("unknown users and repeated failures get the same generic message (no account enumeration)", async ({ page }) => {
  await open(page, 1440);
  for (let i = 0; i < 3; i++) {
    await page.locator("#username").fill("lockout-probe");
    await page.locator("#password").fill(`wrong-${i}`);
    await page.locator("#kc-login").click();
    await expect(page.locator(".finix-error, .finix-alert").first()).toBeVisible();
  }
  const text = await page.locator(".finix-error, .finix-alert").first().innerText();
  expect(text).toContain("Incorrect email address, username or password.");
  expect(text).not.toMatch(/exist|not found|unknown user|no such/i);
});

/** Real Keycloak failures rendered by the FINIX theme: one calm red alert, nothing simulated in the browser. */
const CRED_COPY = "Incorrect email address, username or password. Please check your details and try again.";
async function failSignIn(page: Page, username: string, password: string) {
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#kc-login").click();
  await expect(page.locator("#login-error")).toBeVisible();
}

for (const [name, width, height] of [["desktop", 1440, 900], ["tablet", 820, 1180], ["mobile", 390, 844]] as const) {
  test(`incorrect credentials (${name}): accessible red alert, username kept, password cleared, retry and Forgot password available`, async ({ page }) => {
    await open(page, width, height);
    await failSignIn(page, "alex", "definitely-wrong");
    const alert = page.getByRole("alert").filter({ hasText: "Unable to sign in" });
    await expect(alert).toHaveCount(1); // exactly one alert, not repeated under the fields
    await expect(alert).toContainText(CRED_COPY);
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    // still the Keycloak page: one form, not redirected anywhere
    expect(page.url()).toContain(KEYCLOAK);
    await expect(page.locator("input[type=password]")).toHaveCount(1);
    await expect(page.locator("#username")).toHaveValue("alex");
    await expect(page.locator("#password")).toHaveValue("");
    await expect(page.locator("#password")).toBeFocused();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
    // inputs are programmatically tied to the alert
    for (const id of ["#username", "#password"]) {
      await expect(page.locator(id)).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator(id)).toHaveAttribute("aria-describedby", "login-error");
    }
    // styling: soft red, rounded-xl, subtle red border
    const s = await alert.evaluate(el => { const c = getComputedStyle(el); return { bg: c.backgroundColor, border: c.borderTopColor, radius: c.borderTopLeftRadius, anim: c.animationDuration }; });
    expect(s.bg).toBe("rgb(254, 242, 242)"); expect(s.border).toBe("rgb(254, 202, 202)"); expect(s.radius).toBe("12px"); expect(s.anim).toBe("0.2s");
    // full width of the form column, no overflow, readable
    const box = (await alert.boundingBox())!, field = (await page.locator("#username").boundingBox())!;
    expect(Math.abs(box.width - field.width)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: test.info().outputPath(`incorrect-credentials-${name}.png`), fullPage: true });
    // retry works
    await page.locator("#password").fill("DemoPass123!");
    await page.locator("#kc-login").click();
    await expect(page).toHaveURL(`${APP}/cards`, { timeout: 30_000 });
  });
}

test("unknown username, unknown email and wrong password are indistinguishable", async ({ page }) => {
  await open(page, 1440);
  const texts: string[] = [];
  for (const who of ["no-such-user-finix", "nobody-here@example.test", "alex"]) {
    await failSignIn(page, who, "wrong-password-1");
    texts.push((await page.locator("#login-error").innerText()).trim());
  }
  expect(new Set(texts).size, texts.join(" | ")).toBe(1);
  expect(texts[0]).toContain(CRED_COPY);
  expect(texts[0]).not.toMatch(/exist|not found|unknown|no such|disabled|locked/i);
});

test("error alert is not rendered on a fresh sign-in page, and animation respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, 1440);
  await expect(page.locator("#login-error")).toHaveCount(0);
  await failSignIn(page, "alex", "wrong");
  expect(await page.locator("#login-error").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
});

test("password reset gives the same neutral answer whether or not the account exists, then returns to sign-in", async ({ page }) => {
  await open(page, 1440);
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await page.locator("#username").fill("nobody-here@example.test");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("You should receive an email shortly with further instructions.");
  await expect(page.locator("#login-error")).toHaveCount(0); // informational, not an error
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
});

/** Disabled and locked-out accounts, using a throwaway user created (and always deleted) through the admin API. Skips without admin credentials. */
test.describe("account states (throwaway user)", () => {
  const ADMIN_PASSWORD = process.env.KC_BOOTSTRAP_ADMIN_PASSWORD;
  const LOCKED_COPY = "Your account is temporarily unavailable. Please try again later or contact support.";
  // The realm uses the email address as the username, so the throwaway identity is an email.
  const username = `e2e-state-${Date.now()}@example.test`, password = "Correct-Horse-9!";
  let headers: Record<string, string>, id = "";
  test.beforeAll(async ({ request }) => {
    test.skip(!ADMIN_PASSWORD, "Keycloak admin credentials not available");
    const tok = await request.post(`${KEYCLOAK}/realms/master/protocol/openid-connect/token`, { form: { grant_type: "password", client_id: "admin-cli", username: "admin", password: ADMIN_PASSWORD! } });
    test.skip(!tok.ok(), "Keycloak admin login rejected");
    headers = { Authorization: `Bearer ${(await tok.json()).access_token}` };
    const made = await request.post(`${KEYCLOAK}/admin/realms/finix/users`, { headers, data: { username, email: username, firstName: "Test", lastName: "User", attributes: { termsAccepted: ["true"] }, enabled: true, emailVerified: true, credentials: [{ type: "password", value: password, temporary: false }] } });
    expect(made.status()).toBe(201);
    id = made.headers().location.split("/").pop()!;
  });
  test.afterAll(async ({ request }) => { if (id) await request.delete(`${KEYCLOAK}/admin/realms/finix/users/${id}`, { headers }); });

  test("valid credentials sign in, with the email typed in any letter case", async ({ browser }) => {
    for (const who of [username, username.toUpperCase()]) {
      const ctx = await browser.newContext(); const page = await ctx.newPage();
      await open(page, 1440);
      await page.locator("#username").fill(who); await page.locator("#password").fill(password); await page.locator("#kc-login").click();
      await expect(page).toHaveURL(`${APP}/cards`, { timeout: 30_000 });
      await ctx.close();
    }
  });

  test("disabled account shows the unavailable message, and never reveals more than that", async ({ page, request }) => {
    await request.put(`${KEYCLOAK}/admin/realms/finix/users/${id}`, { headers, data: { enabled: false } });
    await open(page, 1440);
    await page.locator("#username").fill(username); await page.locator("#password").fill(password); await page.locator("#kc-login").click();
    await expect(page.locator("#login-error")).toBeVisible();
    const text = await page.locator("#login-error").innerText();
    expect(text).toMatch(/Unable to sign in/);
    expect([CRED_COPY, LOCKED_COPY].some(c => text.includes(c)), text).toBe(true);
    expect(page.url()).toContain(KEYCLOAK);
    await request.put(`${KEYCLOAK}/admin/realms/finix/users/${id}`, { headers, data: { enabled: true } });
  });

  test("repeated failures lock the account temporarily; nothing signs in and the message is safe", async ({ page, request }) => {
    test.setTimeout(240_000);
    await open(page, 1440);
    for (let i = 0; i < 11; i++) {
      await page.locator("#username").fill(username); await page.locator("#password").fill(`bad-${i}`); await page.locator("#kc-login").click();
      await expect(page.locator("#login-error")).toBeVisible();
    }
    // even the right password is refused while locked
    await page.locator("#username").fill(username); await page.locator("#password").fill(password); await page.locator("#kc-login").click();
    await expect(page.locator("#login-error")).toBeVisible();
    expect(page.url()).toContain(KEYCLOAK);
    const text = await page.locator("#login-error").innerText();
    expect([CRED_COPY, LOCKED_COPY].some(c => text.includes(c)), text).toBe(true);
    await page.screenshot({ path: test.info().outputPath("locked.png") });
    await request.delete(`${KEYCLOAK}/attack-detection/brute-force/users/${id}`.replace(KEYCLOAK, `${KEYCLOAK}/admin/realms/finix`), { headers });
  });
});

test.describe("development account preview (dev theme)", () => {
  test("shows alex / DemoPass123! beneath the Sign In button, with working copy buttons", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: KEYCLOAK });
    await open(page, 1440);
    const card = page.getByRole("region", { name: "Development Account" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Use these credentials to explore the FINIX development banking dashboard.")).toBeVisible();
    await expect(card.getByText("alex", { exact: true })).toBeVisible();
    await expect(card.getByText("DemoPass123!", { exact: true })).toBeVisible();
    const button = (await page.locator("#kc-login").boundingBox())!, box = (await card.boundingBox())!;
    expect(box.y, "card sits directly below the Sign In button").toBeGreaterThan(button.y + button.height - 1);
    await card.getByRole("button", { name: "Copy username" }).click();
    await expect(card.getByRole("status")).toHaveText("Username copied to clipboard.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("alex");
    await card.getByRole("button", { name: "Copy password" }).click();
    await expect(card.getByRole("status")).toHaveText("Password copied to clipboard.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("DemoPass123!");
  });

  test("'Use demo credentials' only fills the form; signing in still goes through Keycloak", async ({ page }) => {
    await open(page, 1440);
    await page.getByRole("button", { name: "Use demo credentials" }).click();
    await expect(page.locator("#username")).toHaveValue("alex");
    await expect(page.locator("#password")).toHaveValue("DemoPass123!");
    expect(page.url(), "nothing was submitted").toContain(KEYCLOAK);
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await expect(page).toHaveURL(`${APP}/cards`, { timeout: 30_000 });
  });

  for (const width of [375, 390, 768, 1024, 1440]) {
    test(`card is readable and does not overflow at ${width}px`, async ({ page }) => {
      await open(page, width);
      const card = page.getByRole("region", { name: "Development Account" });
      await expect(card).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      for (const name of ["Copy username", "Copy password", "Use demo credentials"]) {
        const b = (await card.getByRole("button", { name }).boundingBox())!;
        expect(b.height, name).toBeGreaterThanOrEqual(44); expect(b.width, name).toBeGreaterThanOrEqual(44);
        expect(b.x + b.width, name).toBeLessThanOrEqual(width);
      }
      const c = (await card.boundingBox())!; expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x + c.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/devcard-${width}.png` });
    });
  }

  test("the shipped theme and every public bundle contain no demo password; the preview exists only in the dev theme", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
    const shipped = walk("../infra/keycloak/themes/finix");
    for (const f of shipped) expect(readFileSync(f, "utf8"), f).not.toContain("DemoPass123!");
    const devFtl = readFileSync("../infra/keycloak/themes/finix-dev/login/dev-credentials.ftl", "utf8");
    expect(devFtl).toContain("properties.devCredentialsPreview");
    expect(devFtl).toMatch(/starts_with\('http:\/\/localhost:'\)/);
    expect(devFtl).toMatch(/starts_with\('http:\/\/127\.0\.0\.1:'\)/);
    expect(readFileSync("../infra/keycloak/themes/finix/login/dev-credentials.ftl", "utf8")).not.toMatch(/<section|devPassword/);
    // the Next.js app (any build output present) never contains it either
    for (const dir of [".next/static", ".next-demo/static", ".next-demoauth/static"]) { try { for (const f of walk(dir)) expect(readFileSync(f, "utf8"), f).not.toContain("DemoPass123!"); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; } }
  });
});
