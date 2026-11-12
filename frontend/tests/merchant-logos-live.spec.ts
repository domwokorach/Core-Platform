import { test, expect } from "@playwright/test";

/**
 * Live check against the running stack (Docker web :3000, API :8080, Keycloak :8081) with the real Logo.dev key baked into the build:
 * the seeded customer's real /api/transactions, real merchant logos from img.logo.dev. Skipped when the stack or Logo.dev is unreachable.
 */
const APP = "http://localhost:3000";
const KEYCLOAK = "http://localhost:8081";
const USER = { username: "alex", password: "DemoPass123!" };
const MERCHANTS = [["netflix.com", "Netflix"], ["dkny.com", "DKNY"], ["starbucks.com", "Starbucks Coffee"], ["kfc.com", "KFC"]] as const;

test.describe.configure({ timeout: 90_000 });
test.beforeAll(async ({ request }) => {
  const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
  const web = await request.get(`${APP}/login?error=callback`, { timeout: 5000 }).then(r => r.ok(), () => false);
  const logos = await request.get("https://img.logo.dev/netflix.com?size=16", { timeout: 8000 }).then(() => true, () => false);
  test.skip(!up || !web || !logos, "stack or img.logo.dev not reachable");
});

for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
  test(`real merchant logos on the transactions page (${name}); amounts are GBP and unchanged`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const logoRequests: string[] = [];
    page.on("request", r => { if (r.url().startsWith("https://img.logo.dev/")) logoRequests.push(r.url()); });
    await page.goto(`${APP}/transactions`);
    await page.waitForURL(`${KEYCLOAK}/**`);
    await page.locator("#username").fill(USER.username); await page.locator("#password").fill(USER.password); await page.locator("#kc-login").click();
    await expect(page).toHaveURL(`${APP}/transactions`, { timeout: 30_000 });

    for (const [domain, merchant] of MERCHANTS) {
      const tile = page.locator(`[data-merchant-logo]:visible`).filter({ has: page.locator(`img[alt="${merchant} logo"]`) }).first();
      await expect(tile, `${merchant} tile`).toBeVisible({ timeout: 20_000 });
      await expect(tile).toHaveAttribute("data-logo-status", "loaded", { timeout: 20_000 });
      const img = tile.locator("img");
      await expect(img).toHaveAttribute("src", new RegExp(`^https://img\\.logo\\.dev/${domain.replace(".", "\\.")}\\?`));
      expect(await img.evaluate((el: HTMLImageElement) => [el.naturalWidth > 0, getComputedStyle(el).objectFit])).toEqual([true, "contain"]);
      const box = (await tile.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(35); expect(box.width).toBeLessThanOrEqual(45);
    }
    // only the four verified domains plus display parameters go to the provider: no descriptors, amounts or identity
    for (const url of new Set(logoRequests)) {
      const u = new URL(url);
      expect(MERCHANTS.map(m => m[0])).toContain(u.pathname.slice(1));
      expect([...u.searchParams.keys()].sort()).toEqual(["fallback", "format", "size", "token"]);
      expect(u.searchParams.get("token")!.startsWith("pk_")).toBe(true);
    }
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/£/); expect(text).not.toMatch(/\$|€/);
    await page.screenshot({ path: `/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/logos-live-${name}.png` });
  });
}
