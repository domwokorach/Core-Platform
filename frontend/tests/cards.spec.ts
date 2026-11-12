import { test, expect, type Page } from "@playwright/test";

const APP = "http://localhost:3000";
const API = "http://localhost:8080";
const KEYCLOAK = "http://localhost:8081";
const DEV_USER = { username: "alex", password: "DemoPass123!" };

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Signed-out demo: read-only sample cards, no balances, actions ask the visitor to sign in. */
test.describe("cards page (signed-out demo)", () => {
  for (const [name, width, height] of [["mobile", 390, 844], ["tablet", 768, 1024], ["desktop", 1440, 900]] as const) {
    test(`${name}: renders cards, no balances, no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/cards");
      await expect(page.getByRole("list", { name: "Your virtual cards" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Everyday account virtual card.*Active/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /Savings account virtual card.*Pending activation/ })).toBeVisible();
      await expect(page.getByText("Virtual · Sandbox").first()).toBeVisible();
      const text = await page.locator("main").innerText();
      for (const balance of ["£4,556.15", "£5,968.00", "£10,524.15"]) expect(text).not.toContain(balance);
      expect(text).not.toMatch(/Card management (is )?unavailable|aren’t part of this core banking starter/i);
      expect(await noSideScroll(page)).toBe(true);
      await page.screenshot({ path: `test-results/screens/cards-${name}.png`, fullPage: true });
    });
  }

  test("management actions ask the visitor to sign in; sandbox disclosure is visible", async ({ page }) => {
    await page.goto("/cards");
    await expect(page.getByRole("note").filter({ hasText: "can’t be used at real merchants" })).toBeVisible();
    await page.getByRole("button", { name: "Create Virtual Card" }).click();
    await expect(page.getByText("Sign in to create sandbox cards.")).toBeVisible();
    await page.getByRole("button", { name: "Freeze Card" }).click();
    await expect(page.getByText("Sign in to manage sandbox cards.")).toBeVisible();
  });

  test("selecting a card shows its management panel; the pending card offers activation", async ({ page }) => {
    await page.goto("/cards");
    await page.getByRole("button", { name: /Savings account virtual card/ }).click();
    await expect(page.getByRole("button", { name: "Activate card" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Freeze Card" })).toHaveCount(0);
    await expect(page.getByText("don’t restrict internal transfers").first()).toBeVisible();
  });

  test("dark mode renders", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/cards");
    await expect(page.getByRole("button", { name: /Everyday account virtual card/ })).toBeVisible();
    await page.screenshot({ path: "test-results/screens/cards-dark.png", fullPage: true });
  });
});

/** Signed in against the real Keycloak + Spring API (skipped when they are not running). */
test.describe("cards page (signed in, real API)", () => {
  test.beforeAll(async ({ request }) => {
    const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
    const api = await request.get(`${API}/actuator/health`, { timeout: 5000 }).then(r => r.ok(), () => false);
    test.skip(!up || !api, "Local Keycloak / API is not running");
  });

  async function signIn(page: Page) {
    await page.goto(`${APP}/login`);
    await page.waitForURL(`${KEYCLOAK}/**`);
    await page.locator("#username").fill(DEV_USER.username);
    await page.locator("#password").fill(DEV_USER.password);
    await page.locator("#kc-login").click();
    await expect(page).toHaveURL(`${APP}/`, { timeout: 30_000 });
    await page.goto(`${APP}/cards`);
    await expect(page.getByRole("list", { name: "Your virtual cards" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Live" })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500); // let the card stream finish its handshake
  }

  /** Calls the API with the page's own access token, as another client/session would. */
  const apiCall = (page: Page, path: string, method = "POST", body?: unknown) => page.evaluate(async ({ api, path, method, body }) => {
    const key = Object.keys(sessionStorage).find(k => k.startsWith("oidc.user:"))!;
    const token = JSON.parse(sessionStorage.getItem(key)!).access_token as string;
    const r = await fetch(`${api}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { api: API, path, method, body });

  test("freeze and unfreeze persist, update the UI and survive a reload", async ({ page }) => {
    await signIn(page);
    const everyday = page.getByRole("button", { name: /Everyday account virtual card/ }).first();
    await everyday.click();
    await expect(page.getByRole("button", { name: "Unfreeze Card" })).toHaveCount(0);

    await page.getByRole("button", { name: "Freeze Card" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Freeze card" }).click();
    await expect(everyday).toContainText("Frozen");
    await page.reload();
    await expect(page.getByRole("button", { name: /Everyday account virtual card.*Frozen/ }).first()).toBeVisible();

    await page.getByRole("button", { name: "Unfreeze Card" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Unfreeze card" }).click();
    await expect(page.getByRole("button", { name: /Everyday account virtual card.*Active/ }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Activity log" }).click();
    await expect(page.getByText("Card frozen").first()).toBeVisible();
    await expect(page.getByText("Card unfrozen").first()).toBeVisible();
  });

  test("limits are validated in the dialog and by the server, then enforced on authorizations", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /Everyday account virtual card/ }).first().click();
    await page.getByRole("button", { name: "Spending limits" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Daily limit (GBP)").fill("6000");
    await dialog.getByRole("button", { name: "Save limits" }).click();
    await expect(dialog.getByText("can't be more than £5,000.00")).toBeVisible();
    await dialog.getByLabel("Daily limit (GBP)").fill("100");
    await dialog.getByLabel("Single-transaction limit (GBP)").fill("250");
    await dialog.getByRole("button", { name: "Save limits" }).click();
    await expect(dialog.getByText("single-transaction limit can't exceed the daily limit")).toBeVisible();

    await dialog.getByLabel("Daily limit (GBP)").fill("500");
    await dialog.getByLabel("Single-transaction limit (GBP)").fill("80");
    await dialog.getByRole("button", { name: "Save limits" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("£80.00").first()).toBeVisible();

    const over = await apiCall(page, "/api/cards", "GET");
    const id = (over.body as { id: string; cardType: string }[]).find(c => c.cardType === "EVERYDAY")!.id;
    const declined = await apiCall(page, `/api/cards/${id}/sandbox-authorizations`, "POST", { merchantName: "Big TV", amountMinor: 8100, channel: "IN_STORE" });
    expect(declined.body).toMatchObject({ outcome: "DECLINED", declineReason: "SINGLE_LIMIT_EXCEEDED" });
    const server = await apiCall(page, `/api/cards/${id}/limits`, "PATCH", { dailyLimitMinor: 999_999_999 });
    expect(server.status).toBe(422);

    // restore the seeded defaults
    await page.getByRole("button", { name: "Spending limits" }).click();
    await dialog.getByLabel("Single-transaction limit (GBP)").fill("250");
    await dialog.getByRole("button", { name: "Save limits" }).click();
    await expect(dialog).toBeHidden();
  });

  test("changes made elsewhere appear live without a reload", async ({ page }) => {
    await signIn(page);
    const cards = await apiCall(page, "/api/cards", "GET");
    const everyday = (cards.body as { id: string; cardType: string }[]).find(c => c.cardType === "EVERYDAY")!;
    await page.getByRole("button", { name: /Everyday account virtual card/ }).first().click();
    expect((await apiCall(page, `/api/cards/${everyday.id}/freeze`)).status).toBe(200);
    await expect(page.getByRole("button", { name: /Everyday account virtual card.*Frozen/ }).first()).toBeVisible({ timeout: 8000 });
    expect((await apiCall(page, `/api/cards/${everyday.id}/unfreeze`)).status).toBe(200);
    await expect(page.getByRole("button", { name: /Everyday account virtual card.*Active/ }).first()).toBeVisible({ timeout: 8000 });
  });

  test("create a virtual card through the dialog", async ({ page }) => {
    await signIn(page);
    const existing = await apiCall(page, "/api/cards", "GET");
    test.skip((existing.body as unknown[]).length >= 5, "Dev customer already holds the maximum of 5 sandbox cards");
    await page.getByRole("button", { name: "Create Virtual Card" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Issue sandbox card" }).click();
    await expect(dialog.getByText("Confirm that this is a sandbox card")).toBeVisible();
    await dialog.getByRole("radio", { name: /Savings card/ }).click();
    await dialog.getByLabel("I understand this is a sandbox card for testing only.").check();
    await dialog.getByRole("button", { name: "Issue sandbox card" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: /virtual card.*Pending activation/ }).last()).toBeVisible();
    expect(await page.locator("main").innerText()).not.toMatch(/£4,556\.15|£5,968\.00/);
  });
});
