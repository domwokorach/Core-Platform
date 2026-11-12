import { test, expect, type Page } from "@playwright/test";
import { isValidDomain, logoUrl } from "../lib/logo";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const TOKEN = "pk_test_playwright_token";
const MERCHANTS = [
  { id: "netflix", name: "Netflix", domain: "netflix.com", category: "Entertainment" },
  { id: "dkny", name: "DKNY", domain: "dkny.com", category: "Fashion" },
  { id: "starbucks", name: "Starbucks Coffee", domain: "starbucks.com", category: "Food & Drink" },
  { id: "kfc", name: "KFC", domain: "kfc.com", category: "Food & Drink" },
] as const;

interface LogoMock { requests: string[]; delayMs?: Record<string, number>; status?: Record<string, number | "abort"> }
/** Stand-in for Logo.dev: records every request and returns a PNG (or the configured failure) per domain. */
async function mockLogos(page: Page, m: LogoMock = { requests: [] }) {
  await page.route("https://img.logo.dev/**", async route => {
    const url = new URL(route.request().url()); m.requests.push(url.toString());
    const domain = url.pathname.slice(1);
    const behaviour = m.status?.[domain] ?? 200;
    if (m.delayMs?.[domain]) await new Promise(r => setTimeout(r, m.delayMs![domain]));
    if (behaviour === "abort") return route.abort("failed");
    if (behaviour !== 200) return route.fulfill({ status: behaviour, contentType: "application/json", body: JSON.stringify({ err: "not found" }) });
    return route.fulfill({ status: 200, contentType: "image/png", body: PNG });
  });
  return m;
}
const tile = (page: Page, id: string) => page.locator(`table [data-merchant-logo="${id}"]`).first();

test.describe("logo URL builder (no browser)", () => {
  test("builds the documented Logo.dev URL from a verified domain", () => {
    expect(logoUrl("netflix.com", 128, TOKEN)).toBe(`https://img.logo.dev/netflix.com?token=${TOKEN}&size=128&format=png&fallback=404`);
    for (const m of MERCHANTS) expect(logoUrl(m.domain, 128, TOKEN)).toContain(`https://img.logo.dev/${m.domain}?`);
  });
  test("no token, secret key or unsafe domain means no URL at all", () => {
    expect(logoUrl("netflix.com", 128, undefined)).toBeNull();
    expect(logoUrl("netflix.com", 128, "")).toBeNull();
    expect(logoUrl("netflix.com", 128, "sk_secret_must_never_ship")).toBeNull();
    for (const bad of ["", null, undefined, "netflix", "netflix.com/../x", "netflix.com?x=1", "http://netflix.com", "a b.com", "evil.com#", "-x.com", "x..com", "NETFLIX COM"])
      expect(logoUrl(bad as string, 128, TOKEN), String(bad)).toBeNull();
    expect(isValidDomain("kfc.com")).toBe(true);
  });
});

test.describe("merchant logos on transaction history (demo data)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Netflix, DKNY, Starbucks and KFC each load their own logo, unmodified", async ({ page }) => {
    const m = await mockLogos(page);
    await page.goto("/transactions");
    for (const mer of MERCHANTS) {
      const img = tile(page, mer.id).locator("img");
      await expect(img).toHaveAttribute("src", new RegExp(`^https://img\\.logo\\.dev/${mer.domain.replace(".", "\\.")}\\?`));
      await expect(img).toHaveAttribute("alt", `${mer.name} logo`);
      await expect(tile(page, mer.id)).toHaveAttribute("data-logo-status", "loaded");
      expect(await img.evaluate(e => getComputedStyle(e).objectFit)).toBe("contain");   // never stretched or cropped
      expect(await img.evaluate(e => getComputedStyle(e).filter)).toBe("none");         // no monochrome/recolour filter
      const url = new URL((await img.getAttribute("src"))!);
      const q = Object.fromEntries(url.searchParams);
      expect(q).toMatchObject({ size: "128", format: "png", fallback: "404" });
      expect(Object.keys(q).sort()).toEqual(["fallback", "format", "size", "token"]);
      expect(q.token).toMatch(/^pk_/);   // publishable key only (value comes from the environment)
    }
    expect(m.requests.length).toBeGreaterThanOrEqual(4);
  });

  test("only verified domains and display parameters are sent to the logo provider", async ({ page }) => {
    const m = await mockLogos(page);
    await page.goto("/transactions");
    await expect(tile(page, "netflix")).toHaveAttribute("data-logo-status", "loaded");
    await page.getByRole("button", { name: /Netflix/ }).first().click();
    await page.waitForTimeout(500);
    const allowed = new Set<string>(MERCHANTS.map(x => x.domain));
    for (const r of m.requests) {
      const u = new URL(r);
      expect(allowed.has(u.pathname.slice(1)), r).toBe(true);
      expect([...u.searchParams.keys()].sort()).toEqual(["fallback", "format", "size", "token"]);
      expect(r).not.toMatch(/Payroll|Opening|Monthly|£|%C2%A3|\d{4,}|TRF-|COFFEE|RETAIL/i); // no descriptors, amounts, references
    }
  });

  test("loading placeholder shows first, then the logo fades in", async ({ page }) => {
    await mockLogos(page, { requests: [], delayMs: { "netflix.com": 900 } });
    await page.goto("/transactions");
    await expect(tile(page, "netflix")).toHaveAttribute("data-logo-status", "loading");
    await expect(tile(page, "netflix")).toHaveAttribute("data-logo-status", "loaded", { timeout: 5000 });
  });

  test("a 404 (no logo), a network failure and a rate limit each fall back to a neutral icon without breaking the list", async ({ page }) => {
    await mockLogos(page, { requests: [], status: { "kfc.com": 404, "netflix.com": "abort", "dkny.com": 429 } });
    await page.goto("/transactions");
    for (const id of ["kfc", "netflix", "dkny"]) {
      await expect(tile(page, id)).toHaveAttribute("data-logo-status", "error");
      await expect(tile(page, id).locator("img")).toHaveCount(0);            // no broken-image graphic
      await expect(tile(page, id).locator("svg")).toHaveCount(1);            // neutral store icon
    }
    await expect(tile(page, "starbucks")).toHaveAttribute("data-logo-status", "loaded"); // others unaffected
    for (const name of ["KFC", "Netflix", "DKNY", "Starbucks Coffee"]) await expect(page.locator("table").getByText(name, { exact: true }).first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(7);
  });

  test("balances and every amount are unchanged by logo success or failure, and are in GBP", async ({ page }) => {
    await mockLogos(page, { requests: [], status: { "netflix.com": "abort" } });
    await page.goto("/");
    await expect(page.getByText("£10,524.15").first()).toBeVisible();
    await page.goto("/transactions");
    await expect(page.locator("table tbody tr")).toHaveCount(7);
    const rows = await page.locator("table tbody tr").allInnerTexts();
    const text = rows.join("\n");
    expect(text).toContain("−£70.00");   // Netflix
    expect(text).toContain("−£14.99");   // Starbucks
    expect(text).toContain("−£40.00");   // DKNY
    expect(text).toContain("−£12.60");   // KFC
    expect(text).toContain("+£3,762.11"); // Payroll
    expect(text).not.toContain("$");
    await page.goto("/");
    await expect(page.getByText("£10,524.15").first()).toBeVisible();
  });

  test("category and merchant name appear, and search finds merchants by name or category", async ({ page }) => {
    await mockLogos(page);
    await page.goto("/transactions");
    await expect(page.locator("table").getByText("Entertainment", { exact: true })).toBeVisible();
    await page.getByRole("searchbox", { name: "Filter transactions" }).fill("Food & Drink");
    await expect(page.locator("table tbody tr")).toHaveCount(2); // Starbucks + KFC
    await expect(tile(page, "starbucks")).toBeVisible();
    await page.getByRole("searchbox", { name: "Filter transactions" }).fill("donna");
    await expect(page.getByText("No matching transactions")).toBeVisible(); // aliases are not search terms
  });

  test("detail drawer shows the large logo, merchant, category, status and GBP amount", async ({ page }) => {
    await mockLogos(page);
    await page.goto("/transactions");
    await page.getByRole("button", { name: /Netflix/ }).first().click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.locator('[data-merchant-logo="netflix"] img')).toHaveAttribute("alt", "Netflix logo");
    expect((await dlg.locator('[data-merchant-logo="netflix"]').boundingBox())!.width).toBe(56);
    await expect(dlg).toContainText("Entertainment");
    await expect(dlg).toContainText("Completed");
    await expect(dlg).toContainText("−£70.00");
  });

  test("dashboard recent activity and notifications show logos", async ({ page }) => {
    await mockLogos(page);
    await page.goto("/");
    await expect(page.locator('[data-merchant-logo="starbucks"] img').first()).toBeVisible();
    await page.goto("/notifications");
    await expect(page.getByRole("list", { name: "Recent payments" }).locator('[data-merchant-logo="netflix"] img')).toBeVisible();
  });

  test("Logo.dev attribution is visible and safe", async ({ page }) => {
    await mockLogos(page);
    await page.goto("/transactions");
    const link = page.getByRole("link", { name: "Logos provided by Logo.dev" });
    await expect(link).toHaveAttribute("href", "https://logo.dev");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("tiles keep a white, bordered container in dark mode so brand colours are authentic", async ({ page }) => {
    await mockLogos(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/transactions");
    await expect(tile(page, "netflix")).toHaveAttribute("data-logo-status", "loaded");
    expect(await tile(page, "netflix").evaluate(e => getComputedStyle(e).backgroundColor)).toBe("rgb(255, 255, 255)");
    expect(await tile(page, "netflix").locator("img").evaluate(e => getComputedStyle(e).filter)).toBe("none");
    await page.screenshot({ path: "test-results/screens/1440-transactions-logos-dark.png", fullPage: true });
  });
});

for (const v of [{ w: 390, h: 844, px: 36, list: true }, { w: 768, h: 1024, px: 40, list: false }, { w: 1440, h: 900, px: 44, list: false }]) {
  test(`logo container is ${v.px}px at ${v.w}px, with no overflow`, async ({ page }) => {
    await page.setViewportSize({ width: v.w, height: v.h });
    await mockLogos(page);
    await page.goto("/transactions");
    const t = page.locator(v.list ? 'ul [data-merchant-logo="netflix"], [role="list"] [data-merchant-logo="netflix"]' : 'table [data-merchant-logo="netflix"]').first();
    await expect(t).toHaveAttribute("data-logo-status", "loaded");
    const box = (await t.boundingBox())!;
    expect(Math.round(box.width)).toBe(v.px);
    expect(Math.round(box.height)).toBe(v.px);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/screens/${v.w}-transactions-logos.png`, fullPage: true });
  });
}

test("long merchant names truncate and amounts stay visible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockLogos(page);
  await page.goto("/transactions");
  const row = page.getByRole("button", { name: /Starbucks Coffee/ }).first();
  const box = (await row.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  await expect(row).toContainText("−£14.99");
});

test.describe("signed in: unknown merchants", () => {
  test("an unknown merchant shows a neutral icon, never a logo or a logo request", async ({ page, context }) => {
    await context.addInitScript(() => {
      sessionStorage.setItem("oidc.user:http://localhost:8081/realms/finix:finix-web", JSON.stringify({ access_token: "t", token_type: "Bearer", scope: "openid", profile: { sub: "u1", name: "Alex Morgan" }, expires_at: Math.floor(Date.now() / 1000) + 3600 }));
    });
    const m = await mockLogos(page);
    const now = new Date().toISOString();
    const A = "11111111-1111-4111-8111-111111111111";
    const txs = [
      { id: "1", accountId: A, description: "Acme Widgets Ltd", amountMinor: -2599, currency: "GBP", occurredAt: now, reference: "R1", merchant: null, status: "COMPLETED" },
      { id: "2", accountId: A, description: "Netflix", amountMinor: -1599, currency: "GBP", occurredAt: now, reference: "R2", merchant: MERCHANTS[0], status: "COMPLETED" },
      { id: "3", accountId: A, description: "Starbucksy Ltd", amountMinor: -300, currency: "GBP", occurredAt: now, reference: "R3", merchant: null, status: "COMPLETED" },
    ];
    await page.route("http://localhost:8080/**", route => {
      const p = new URL(route.request().url()).pathname;
      const json = (b: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
      if (p.endsWith("/stream") || p.endsWith("/events")) return route.fulfill({ status: 200, contentType: "text/event-stream", body: "event: stream.ready\ndata: {\"heartbeatSeconds\":20}\n\n" });
      if (p === "/api/dashboard") return json({ customerName: "Alex Morgan", currency: "GBP", totalBalanceMinor: 100000, monthlyIncomeMinor: 0, monthlySpendingMinor: 4498, accounts: [{ id: A, displayName: "Everyday account", maskedNumber: "•••• 4568", currency: "GBP", balanceMinor: 100000, brand: "VISA" }], transactions: txs });
      if (p === "/api/transactions") return json(txs);
      if (p === "/api/accounts") return json([{ id: A, displayName: "Everyday account", maskedNumber: "•••• 4568", currency: "GBP", balanceMinor: 100000, brand: "VISA" }]);
      return json([]);
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/transactions");
    await expect(page.locator("table").getByText("Netflix", { exact: true })).toBeVisible();
    const unknown = page.locator('table [data-merchant-logo="fallback"]');
    await expect(unknown).toHaveCount(2);
    await expect(unknown.first().locator("img")).toHaveCount(0);
    await expect(unknown.first().locator("svg")).toHaveCount(1);
    await expect(page.locator("table").getByText("Acme Widgets Ltd", { exact: true })).toBeVisible();
    await expect(page.locator("table").getByText("−£25.99")).toBeVisible();
    expect(m.requests.every(r => r.includes("/netflix.com?")), "only the verified merchant is ever requested").toBe(true);
  });
});
