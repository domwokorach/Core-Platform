import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const API = "http://localhost:8080";
const AUTHORITY = "http://localhost:8081/realms/finix";
const NOW = Date.now();

/** A signed-in OIDC session (oidc-client-ts reads it from sessionStorage) so the app uses the real authenticated code path. */
async function signIn(context: BrowserContext) {
  await context.addInitScript(([authority]) => {
    const user = { access_token: "test-access-token", token_type: "Bearer", scope: "openid", profile: { sub: "user-1", name: "Alex Morgan", email: "alex@example.com" }, expires_at: Math.floor(Date.now() / 1000) + 3600 };
    sessionStorage.setItem(`oidc.user:${authority}:finix-web`, JSON.stringify(user));
  }, [AUTHORITY]);
}

const q = (symbol: string, name: string, price: string, change: string, pct: string, o: Partial<Record<string, unknown>> = {}) => ({
  symbol, name, exchange: "NASDAQ", currency: "USD", price, previousClose: "100.00", change, percentChange: pct, open: null, high: null, low: null, volume: 1,
  quotedAt: new Date(NOW - 20_000).toISOString(), fetchedAt: new Date(NOW).toISOString(), marketOpen: true, dataClass: "DELAYED", stale: false,
  externalUrl: `https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}`, source: "Twelve Data",
  gbp: { pair: "USD/GBP", rate: "0.75", rateTimestamp: new Date(NOW - 30_000).toISOString(), source: "Twelve Data", price: (Number(price) * 0.75).toFixed(2), change: null, indicative: true }, ...o,
});
const hist = (symbol: string) => ({ symbol, range: "1M", interval: "1day", currency: "USD", timezone: "America/New_York", fetchedAt: new Date(NOW).toISOString(), stale: false,
  points: Array.from({ length: 12 }, (_, i) => ({ t: NOW - (12 - i) * 86_400_000, datetime: `2025-06-${String(i + 1).padStart(2, "0")}`, open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i, volume: 5 })) });

interface Mock { quotes: unknown; quotesStatus?: number; history?: unknown; historyStatus?: number; paper?: boolean; requests: string[] }
async function mockApi(page: Page, m: Mock) {
  await page.route(`${API}/**`, async route => {
    const url = new URL(route.request().url()); const path = url.pathname; m.requests.push(`${route.request().method()} ${url.pathname}${url.search}`);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path.endsWith("/events/stream") || path.endsWith("/market/events")) return route.fulfill({ status: 200, contentType: "text/event-stream", body: "event: stream.ready\ndata: {\"heartbeatSeconds\":20}\n\n" });
    if (path === "/api/market/quotes") return json(m.quotes, m.quotesStatus ?? 200);
    if (path.startsWith("/api/market/history/")) return json(m.history ?? hist(path.split("/").pop()!), m.historyStatus ?? 200);
    if (path === "/api/paper/status") return json({ enabled: !!m.paper, mode: "PAPER", provider: "Alpaca" });
    if (path === "/api/paper/account") return json({ mode: "PAPER", notice: "n", data: { status: "ACTIVE", cash: "100000", equity: "100500.50", buyingPower: "200000", currency: "USD", tradingBlocked: false } });
    if (path === "/api/paper/positions") return json({ mode: "PAPER", notice: "n", data: [] });
    if (path === "/api/paper/orders" && route.request().method() === "POST") return json({ mode: "PAPER", notice: "n", data: { id: "o1", clientOrderId: "c", symbol: "AAPL", side: "buy", type: "market", qty: "2", filledQty: "0", filledAvgPrice: null, status: "accepted", submittedAt: null } }, 201);
    if (path === "/api/paper/orders") return json({ mode: "PAPER", notice: "n", data: [] });
    if (path === "/api/dashboard") return json({ customerName: "Alex Morgan", currency: "GBP", totalBalanceMinor: 1052415, monthlyIncomeMinor: 376211, monthlySpendingMinor: 193467, accounts: [], transactions: [] });
    if (path === "/api/accounts" || path === "/api/transactions" || path === "/api/transfers") return json([]);
    return json({ message: "not mocked" }, 404);
  });
}

const fx = { pair: "USD/GBP", rate: "0.75", rateTimestamp: new Date(NOW - 30_000).toISOString(), source: "Twelve Data", error: null };
const healthy = (): Mock => ({ requests: [], paper: true, quotes: { generatedAt: new Date(NOW).toISOString(), fx, errors: [], quotes: [
  q("AAPL", "Apple Inc.", "200.00", "2.00", "1.01"),
  q("MSFT", "Microsoft Corporation", "400.00", "-4.00", "-0.99", { marketOpen: false, dataClass: "END_OF_DAY" }),
  q("NVDA", "NVIDIA Corporation", "120.50", "0.00", "0.00", { stale: true, dataClass: "STALE" }),
  q("NFLX", "Netflix Inc.", "650.00", "5.00", "0.78", { dataClass: "LIVE" }),
] } });

test.describe("investments (signed in, mocked FINIX API)", () => {
  test.beforeEach(async ({ context }) => { await signIn(context); });

  test("shows all four symbols with native USD prices, indicative GBP, status and freshness labels", async ({ page }) => {
    const m = healthy(); await mockApi(page, m);
    await page.goto("/investments");
    for (const [name, price] of [["Apple Inc.", "US$200.00"], ["Microsoft Corporation", "US$400.00"], ["NVIDIA Corporation", "US$120.50"], ["Netflix Inc.", "US$650.00"]]) {
      const card = page.getByRole("article", { name: new RegExp(name!) });
      await expect(card).toContainText(price!);
      await expect(card).toContainText("Native quote currency: USD");
    }
    const aapl = page.getByRole("article", { name: /Apple/ });
    await expect(aapl).toContainText("£150.00");           // 200 × 0.75, a real converted figure
    await expect(aapl).toContainText("indicative");
    await expect(aapl).toContainText("USD/GBP 0.7500");
    await expect(aapl).toContainText("Market open");
    await expect(aapl).toContainText("Delayed");
    await expect(aapl.getByText("Live", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("article", { name: /Microsoft/ })).toContainText("Market closed");
    await expect(page.getByRole("article", { name: /Microsoft/ })).toContainText("End of day");
    await expect(page.getByRole("article", { name: /NVIDIA/ })).toContainText("Stale");
    await expect(page.getByRole("article", { name: /NVIDIA/ })).toContainText("last saved quote");
    await expect(page.getByRole("article", { name: /Netflix/ })).toContainText("Live");   // only because the backend classified it LIVE
    await expect(aapl).not.toContainText("$200.00".replace("$", "£"));                    // never relabelled as £
    await expect(page.getByText("aren’t connected")).toHaveCount(0);
    await expect(page.getByText("No live quotes")).toHaveCount(0);
  });

  test("price movement uses signed numbers and arrows, not colour alone", async ({ page }) => {
    await mockApi(page, healthy());
    await page.goto("/investments");
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("+2.00 USD");
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("up today");
    await expect(page.getByRole("article", { name: /Microsoft/ })).toContainText("−4.00 USD");
    await expect(page.getByRole("article", { name: /Microsoft/ })).toContainText("down today");
  });

  test("external links open safely in a new tab and are information pages", async ({ page }) => {
    await mockApi(page, healthy());
    await page.goto("/investments");
    for (const s of ["aapl", "msft", "nvda", "nflx"]) {
      const link = page.locator(`a[href="https://www.nasdaq.com/market-activity/stocks/${s}"]`).first();
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("rel", /noreferrer/);
    }
  });

  test("interactive chart: range selector, native currency, valid data, error and retry", async ({ page }) => {
    const m = healthy(); await mockApi(page, m);
    await page.goto("/investments");
    await expect(page.getByRole("img", { name: /AAPL price from US\$101\.00 to US\$112\.00 over 1M/ })).toBeVisible();
    await page.getByRole("radio", { name: "1W" }).click();
    await expect.poll(() => m.requests.some(r => r.includes("/api/market/history/AAPL?range=1W"))).toBe(true);
    await page.getByRole("button", { name: /Show NVIDIA/ }).click();
    await expect.poll(() => m.requests.some(r => r.includes("/history/NVDA"))).toBe(true);
    // chart failure shows a recoverable state, page keeps working
    m.historyStatus = 503; m.history = { code: "PROVIDER_UNAVAILABLE", message: "The market data provider is currently unavailable." };
    await page.getByRole("radio", { name: "3M" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "currently unavailable" })).toBeVisible();
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("US$200.00");
    m.historyStatus = 200; m.history = undefined;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("img", { name: /NVDA price from/ })).toBeVisible();
  });

  test("rate limit: honest per-card message, dashboard does not crash", async ({ page }) => {
    const m = healthy();
    m.quotes = { generatedAt: new Date(NOW).toISOString(), fx: null, quotes: [], errors: ["AAPL", "MSFT", "NVDA", "NFLX"].map(s => ({ symbol: s, code: "RATE_LIMITED", message: "Market data rate limit reached. Showing the latest saved data until it resets.", retryAfterSeconds: 42 })) };
    await mockApi(page, m);
    await page.goto("/investments");
    await expect(page.getByRole("status").filter({ hasText: "rate limit" }).first()).toBeVisible();
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("Price unavailable");
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("42s");
    await expect(page.getByRole("article", { name: /Apple/ })).not.toContainText("US$");
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  });

  test("provider/API failure shows an error with retry, no invented prices", async ({ page }) => {
    const m = healthy(); m.quotesStatus = 503; m.quotes = { code: "PROVIDER_UNAVAILABLE", message: "The market data provider is currently unavailable." };
    await mockApi(page, m);
    await page.goto("/investments");
    await expect(page.getByRole("alert").filter({ hasText: "currently unavailable" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0); // no stock card, hence no price, is rendered
  });

  test("backend without an API key explains how to configure it", async ({ page }) => {
    const m = healthy();
    m.quotes = { generatedAt: new Date(NOW).toISOString(), fx: null, quotes: [], errors: ["AAPL", "MSFT", "NVDA", "NFLX"].map(s => ({ symbol: s, code: "NOT_CONFIGURED", message: "x", retryAfterSeconds: null })) };
    await mockApi(page, m);
    await page.goto("/investments");
    await expect(page.getByText("Market data isn’t configured")).toBeVisible();
    await expect(page.getByText("TWELVE_DATA_API_KEY")).toBeVisible();
  });

  test("missing FX rate hides the GBP estimate instead of inventing one", async ({ page }) => {
    const m = healthy() as Mock & { quotes: { quotes: { gbp: unknown }[]; fx: unknown } };
    m.quotes.quotes.forEach(x => (x.gbp = null)); m.quotes.fx = { pair: "USD/GBP", rate: null, rateTimestamp: null, source: null, error: "RATE_LIMITED" };
    await mockApi(page, m);
    await page.goto("/investments");
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("GBP estimate unavailable");
    await expect(page.getByRole("article", { name: /Apple/ })).not.toContainText("£");
  });

  test("browser never sees provider credentials or calls providers directly", async ({ page }) => {
    const m = healthy(); await mockApi(page, m);
    const external: string[] = [];
    page.on("request", r => { const u = r.url(); if (/twelvedata|alpaca/i.test(u)) external.push(u); });
    await page.goto("/investments");
    await expect(page.getByRole("article", { name: /Apple/ })).toBeVisible();
    expect(external, "no direct provider requests from the browser").toEqual([]);
    const html = await page.content();
    expect(html).not.toMatch(/apikey|TWELVE_DATA_API_KEY=|ALPACA_API_SECRET/i);
    const bundles = await page.evaluate(async () => (await Promise.all([...document.scripts].filter(s => s.src).map(s => fetch(s.src).then(r => r.text())))).join("\n"));
    expect(bundles).not.toMatch(/api\.twelvedata\.com|paper-api\.alpaca\.markets|APCA-API-SECRET-KEY/);
  });

  test("paper trading is clearly labelled and orders go to the FINIX paper API only", async ({ page }) => {
    const m = healthy(); await mockApi(page, m);
    await page.goto("/investments");
    await expect(page.getByText("PAPER · SIMULATED").first()).toBeVisible();
    await expect(page.getByText(/No real money/).first()).toBeVisible();
    await page.getByRole("button", { name: "New order" }).click();
    await expect(page.getByRole("dialog")).toContainText("PAPER TRADING");
    await page.getByLabel(/Shares/).fill("0");
    await expect(page.getByRole("alert").filter({ hasText: "whole number" })).toBeVisible();
    await page.getByLabel(/Shares/).fill("2");
    await page.getByRole("button", { name: "Review order" }).click();
    await page.getByRole("button", { name: "Submit paper order" }).click();
    await expect.poll(() => m.requests).toContain("POST /api/paper/orders");
    expect(m.requests.filter(r => r.startsWith("POST")).every(r => r.includes("/api/paper/") || r.includes("/api/transfers") === false)).toBe(true);
    expect(m.requests.some(r => r.includes("/api/transfers") && r.startsWith("POST")), "paper orders never touch the banking ledger").toBe(false);
  });

  test("paper trading unconfigured shows setup guidance", async ({ page }) => {
    const m = healthy(); m.paper = false; await mockApi(page, m);
    await page.goto("/investments");
    await expect(page.getByText("Paper trading isn’t configured")).toBeVisible();
  });

  test("investments page passes WCAG 2.2 AA scan in light and dark", async ({ page }) => {
    await mockApi(page, healthy());
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/investments");
      await expect(page.getByRole("article", { name: /Apple/ })).toBeVisible();
      await page.waitForTimeout(1500);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      expect(r.violations.map(v => `${scheme}: ${v.id} ${v.nodes.map(n => n.target.join(" ")).slice(0, 3)}`)).toEqual([]);
    }
  });

  for (const v of [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }]) {
    test(`responsive at ${v.w}px: no overflow, screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: v.w, height: v.h });
      await mockApi(page, healthy());
      await page.goto("/investments");
      await expect(page.getByRole("article", { name: /Apple/ })).toBeVisible();
      await page.waitForTimeout(1200);
      const off = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(e => e.tagName + "." + String(e.getAttribute("class")).slice(0, 60) + " r=" + Math.round(e.getBoundingClientRect().right)));
      expect(off, "elements wider than the viewport").toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `test-results/screens/${v.w}-investments-live.png`, fullPage: true });
    });
  }
});

test("signed out: no prices are shown, only a sign-in prompt", async ({ page }) => {
  await page.goto("/investments");
  await expect(page.getByText("Sign in to see market data")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("US$");
  await expect(page.locator("body")).not.toContainText("AAPL");
});

const LOGO_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const DOMAINS = { AAPL: "apple.com", MSFT: "microsoft.com", NVDA: "nvidia.com", NFLX: "netflix.com" } as const;

test.describe("stock logos (Logo.dev, brand imagery only)", () => {
  test.beforeEach(async ({ context }) => { await signIn(context); });

  test("each ticker loads its own verified domain and quotes still come from the FINIX market API", async ({ page }) => {
    const m = healthy(); await mockApi(page, m);
    const logos: string[] = [];
    await page.route("https://img.logo.dev/**", route => { logos.push(route.request().url()); return route.fulfill({ status: 200, contentType: "image/png", body: LOGO_PNG }); });
    await page.goto("/investments");
    for (const [sym, domain] of Object.entries(DOMAINS)) {
      const tile = page.locator(`[data-stock-logo="${sym}"]`).first();
      await expect(tile).toHaveAttribute("data-logo-status", "loaded");
      await expect(tile.locator("img")).toHaveAttribute("src", new RegExp(`^https://img\\.logo\\.dev/${domain.replace(".", "\\.")}\\?.*fallback=404`));
      await expect(tile.locator("img")).toHaveClass(/object-contain/);
    }
    expect(logos.some(u => u.includes("sk_"))).toBe(false);
    expect(logos.every(u => !/AAPL|price|200\.00/.test(u))).toBe(true);   // no market data leaks to Logo.dev
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("US$200.00");
    expect(m.requests.some(r => r.includes("/api/market/quotes"))).toBe(true);
  });

  test("failed logo requests (404, 429, offline) fall back to a neutral icon and never block quotes", async ({ page }) => {
    await mockApi(page, healthy());
    await page.route("https://img.logo.dev/**", route => {
      const d = new URL(route.request().url()).pathname.slice(1);
      if (d === "apple.com") return route.fulfill({ status: 404, body: "{}" });
      if (d === "microsoft.com") return route.fulfill({ status: 429, body: "{}" });
      if (d === "nvidia.com") return route.abort("failed");
      return route.fulfill({ status: 200, contentType: "image/png", body: LOGO_PNG });
    });
    await page.goto("/investments");
    for (const s of ["AAPL", "MSFT", "NVDA"]) {
      const tile = page.locator(`[data-stock-logo="${s}"]`).first();
      await expect(tile).toHaveAttribute("data-logo-status", "error");
      await expect(tile.locator("img")).toHaveCount(0);
      await expect(tile.locator("svg")).toBeVisible();
    }
    await expect(page.locator(`[data-stock-logo="NFLX"]`).first()).toHaveAttribute("data-logo-status", "loaded");
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("US$200.00");
    await expect(page.getByRole("article", { name: /Apple/ })).toContainText("AAPL");
  });

  test("dashboard watchlist shows logos, USD prices, Delayed label and links to /investments", async ({ page }) => {
    await mockApi(page, healthy());
    await page.route("https://img.logo.dev/**", route => route.fulfill({ status: 200, contentType: "image/png", body: LOGO_PNG }));
    await page.goto("/");
    await expect(page.getByText("US stocks · Native USD prices")).toBeVisible();
    await expect(page.getByRole("link", { name: /Open/ }).first()).toHaveAttribute("href", "/investments");
    await expect(page.locator(`[data-stock-logo]`)).toHaveCount(4);
    await expect(page.locator("body")).toContainText("US$200.00");
    await expect(page.getByText("Delayed", { exact: true }).first()).toBeVisible();
  });
});
