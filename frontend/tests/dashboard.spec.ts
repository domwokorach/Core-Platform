import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const VIEWPORTS = [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1024, h: 768 }, { w: 1440, h: 900 }];
const ROUTES = ["/", "/transactions", "/transfers", "/accounts", "/analytics"];

test("signed-out dashboard is clearly labelled as a demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("note").filter({ hasText: "Interactive demo" })).toBeVisible();
  await expect(page.getByText("£10,524.15").first()).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Demo data" })).toBeVisible();
  // never claims to be live
  await expect(page.getByText("Live", { exact: true })).toHaveCount(0);
});

test("search filters history and demo transfers never post", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/transactions");
  await page.getByRole("searchbox", { name: "Search transactions" }).fill("Starbucks");
  await expect(page.getByRole("button", { name: /Starbucks Coffee/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /DKNY/ })).toHaveCount(0);

  await page.goto("/transfers");
  await page.getByLabel("Amount (GBP)").fill("12.50");
  await page.getByLabel("Reference").fill("Test");
  await page.getByRole("button", { name: "Sign in to transfer" }).click();
  await expect(page.getByText("Sign in to move money")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("transfer form shows clear validation errors", async ({ page }) => {
  await page.goto("/transfers");
  await page.getByLabel("Amount (GBP)").fill("abc");
  await page.getByLabel("Reference").click();
  await expect(page.getByRole("alert").filter({ hasText: "valid amount" })).toBeVisible();
});

test("transaction drawer opens and closes with keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/transactions");
  await page.waitForTimeout(1000); // let the page hydrate
  await page.getByRole("button", { name: /Netflix/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const v of VIEWPORTS) {
  test.describe(`${v.w}px`, () => {
    test.use({ viewport: { width: v.w, height: v.h } });
    for (const route of ROUTES) {
      test(`${route}: no horizontal overflow, screenshot`, async ({ page }) => {
        await page.goto(route);
        await page.waitForTimeout(1200); // entrance + chart animations
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(0);
        await page.screenshot({ path: `test-results/screens/${v.w}${route === "/" ? "-dashboard" : route.replace("/", "-")}.png`, fullPage: true });
      });
    }
  });
}

test("dark theme + accessibility scan (WCAG 2 A/AA)", async ({ page }) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.map(v => `${scheme}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`), "axe violations").toEqual([]);
  }
});
