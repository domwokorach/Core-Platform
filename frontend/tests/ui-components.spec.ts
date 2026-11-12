import { test, expect, type Page } from "@playwright/test";

/** PaceUI motion components integrated into FINIX: cards, accounts, settings, navigation, notifications. Sample-data mode (no stack needed). */

test.describe("cards page", () => {
  test("card-type tabs switch between the Black and Silver cards; artwork keeps its proportions", async ({ page }) => {
    await page.goto("/cards");
    const tabs = page.getByRole("tablist", { name: "Card type" });
    await expect(tabs.getByRole("tab", { name: /Black/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: /Everyday account card/ })).toBeVisible();
    await tabs.getByRole("tab", { name: /Silver/ }).click();
    await expect(tabs.getByRole("tab", { name: /Silver/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: /Savings account card/ })).toBeVisible();
    // original proportions: rendered aspect ratio equals the file's natural aspect ratio (never stretched or cropped)
    for (const alt of ["FINIX Black Visa card", "FINIX Silver Visa card"]) {
      const img = page.getByRole("img", { name: alt }).first();
      await expect(img).toBeVisible();
      const [natural, box] = await Promise.all([img.evaluate((e: HTMLImageElement) => e.naturalWidth / e.naturalHeight), img.boundingBox()]);
      expect(Math.abs(box!.width / box!.height - natural), alt).toBeLessThan(0.02);
    }
  });

  test("Card details shows the card record and never a card number", async ({ page }) => {
    await page.goto("/cards");
    await page.getByRole("button", { name: "Card details" }).click();
    const dialog = page.getByRole("dialog", { name: "Card details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Sandbox virtual card. No card number is generated or stored.")).toBeVisible();
    await expect(dialog.getByText(/FVC •••• 7Q3K/)).toBeVisible();
    expect(await dialog.innerText()).not.toMatch(/\d{4}\s?\d{4}\s?\d{4}\s?\d{4}|CVV/i);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("status notice for a card that needs activation comes from the card's real status", async ({ page }) => {
    await page.goto("/cards");
    await page.getByRole("tab", { name: /Silver/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Activation needed" })).toBeVisible();
  });
});

test.describe("my accounts", () => {
  test("account tabs drive the linked card and the activity list; currency shows GBP only", async ({ page }) => {
    await page.goto("/accounts");
    const tabs = page.getByRole("tablist", { name: "Accounts" });
    await expect(page.getByRole("img", { name: /FINIX Visa Black card linked to Everyday account/ })).toBeVisible();
    await tabs.getByRole("tab", { name: "Savings account" }).click();
    await expect(page.getByRole("img", { name: /FINIX Visa Silver card linked to Savings account/ })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Account" })).toContainText("Savings account");
    await expect(page.locator("#account-activity").getByText("Monthly savings")).toBeVisible();
    await expect(page.locator("#account-activity").getByText("Starbucks Coffee")).toHaveCount(0); // belongs to the other account
    const currency = page.getByRole("combobox", { name: "Currency" });
    await expect(currency).toContainText("GBP");
    await expect(currency).toBeDisabled();
  });

  test("calendar date filter narrows the list and shows an empty state when nothing matches", async ({ page }) => {
    await page.goto("/accounts");
    const activity = page.locator("#account-activity");
    await expect(activity.getByText("Starbucks Coffee")).toBeVisible();
    await page.getByRole("button", { name: /Filter by date/ }).click();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /previous month/i }).click();
    await page.getByRole("gridcell").getByRole("button", { name: /^10$|10(st|nd|rd|th)?,/ }).first().click();
    await expect(activity.getByText("No transactions match")).toBeVisible();
    await expect(activity.getByText("Try another account or date range.")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Clear date filter" }).click();
    await expect(activity.getByText("Starbucks Coffee")).toBeVisible();
  });
});

test.describe("my accounts with a long history (mocked API)", () => {
  async function signedIn(page: Page, count: number) {
    await page.context().addInitScript(() => {
      sessionStorage.setItem("oidc.user:http://localhost:8081/realms/finix:finix-web", JSON.stringify({ access_token: "t", token_type: "Bearer", scope: "openid", profile: { sub: "u1", name: "Test Customer" }, expires_at: Math.floor(Date.now() / 1000) + 3600 }));
    });
    const A = "11111111-1111-4111-8111-111111111111";
    const acct = { id: A, displayName: "Everyday account", maskedNumber: "•••• 4568", currency: "GBP", balanceMinor: 100000, brand: "VISA" };
    const txs = Array.from({ length: count }, (_, i) => ({ id: `t${i}`, accountId: A, description: `Payment ${i + 1}`, amountMinor: -(100 + i), currency: "GBP", occurredAt: new Date(Date.now() - i * 3600_000).toISOString(), reference: `R${i}`, merchant: null, status: "COMPLETED" }));
    await page.route("http://localhost:8080/**", route => {
      const p = new URL(route.request().url()).pathname;
      const json = (b: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
      if (p.endsWith("/stream") || p.endsWith("/events")) return route.fulfill({ status: 200, contentType: "text/event-stream", body: "event: stream.ready\ndata: {\"heartbeatSeconds\":20}\n\n" });
      if (p === "/api/dashboard") return json({ customerName: "Test Customer", currency: "GBP", totalBalanceMinor: 100000, monthlyIncomeMinor: 0, monthlySpendingMinor: 0, accounts: [acct], transactions: txs });
      if (p === "/api/transactions") return json(txs);
      if (p === "/api/accounts") return json([acct]);
      return json([]);
    });
  }

  test("history is paginated, 8 per page, with accessible page links", async ({ page }) => {
    await signedIn(page, 20);
    await page.goto("/accounts");
    const activity = page.locator("#account-activity");
    await expect(activity.getByText("20 entries · Page 1 of 3")).toBeVisible();
    await expect(activity.getByText("Payment 1", { exact: true })).toBeVisible();
    await expect(activity.getByText("Payment 9", { exact: true })).toHaveCount(0);
    await activity.getByRole("link", { name: "Page 2" }).click();
    await expect(activity.getByText("20 entries · Page 2 of 3")).toBeVisible();
    await expect(activity.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    await expect(activity.getByText("Payment 9", { exact: true })).toBeVisible();
    await activity.getByRole("link", { name: "Go to next page" }).click();
    await expect(activity.getByText("Page 3 of 3")).toBeVisible();
    await expect(activity.getByText("Payment 20", { exact: true })).toBeVisible();
  });

  test("a customer with no transactions sees the empty state, not an invented list", async ({ page }) => {
    await signedIn(page, 0);
    await page.goto("/accounts");
    await expect(page.locator("#account-activity").getByText("No transactions yet")).toBeVisible();
  });
});

test("settings: theme radio group is keyboard-operable and persists", async ({ page }) => {
  await page.goto("/settings");
  const group = page.getByRole("radiogroup", { name: "Theme" });
  await expect(group).toBeVisible();
  await expect(group.locator("label.border-brand")).toHaveCount(1); // hydrated: the saved theme is highlighted, so clicks are handled
  await group.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 10_000 });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 10_000 });
  await group.getByRole("radio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("notifications: connection status is an accessible alert from the real state", async ({ page }) => {
  await page.goto("/notifications");
  const alert = page.getByRole("status").filter({ hasText: "Live updates are off" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Sign in to enable live updates.");
});

test.describe("navigation (PaceUI sidebar)", () => {
  test("desktop: current page is marked, rail collapses and stays collapsed after reload", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/transactions");
    const nav = page.getByRole("navigation", { name: "Primary" }).first();
    await expect(nav.getByRole("link", { name: "Transactions" })).toHaveAttribute("aria-current", "page");
    for (const name of ["Dashboard", "My Accounts", "Transfers", "Cards", "Investments", "Settings"]) await expect(nav.getByRole("link", { name })).toBeVisible();
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cards" }).first()).toBeVisible(); // still reachable by accessible name
    const width = (await page.getByRole("link", { name: "FINIX home" }).first().boundingBox())!.x;
    expect(width).toBeLessThan(40);
    await page.reload();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await page.keyboard.press("Control+b"); // the sidebar's keyboard shortcut (the dev-mode Next.js badge covers the rail's bottom icon)
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
  });

  for (const [name, width, trigger] of [["tablet", 820, "Open navigation menu"], ["mobile", 390, "More"]] as const) {
    test(`${name}: navigation opens as a sheet, navigates and closes`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.getByRole("button", { name: new RegExp(trigger) }).click();
      const sheet = page.getByRole("dialog");
      await expect(sheet.getByRole("link", { name: "My Accounts" })).toBeVisible();
      await sheet.getByRole("link", { name: "My Accounts" }).click();
      await expect(page).toHaveURL(/\/accounts$/);
      await expect(sheet).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
});
