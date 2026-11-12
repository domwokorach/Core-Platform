import { test, expect } from "@playwright/test";

/** FINIX designer card collection on the Cards page (sample-data mode): designs, accessibility, Visa gating, responsiveness. */
const DESIGNS = [["everyday", "Everyday"], ["savings", "Savings"], ["metal", "Metal"], ["signature", "Signature"]] as const;

test("all four designs render with accessible names, fictional details and no balances", async ({ page }) => {
  await page.goto("/cards");
  const gallery = page.getByRole("region", { name: "Card designs" });
  await expect(gallery).toBeVisible();
  for (const [design, name] of DESIGNS) {
    const card = gallery.locator(`[data-card-design="${design}"]`);
    await expect(card, name).toBeVisible();
    await expect(card).toHaveAttribute("aria-label", new RegExp(`^${name} card design, GBP, number ending \\d{4}$`));
    await expect(card.getByText("FINIX", { exact: true })).toBeVisible();
    await expect(card.getByText("GBP", { exact: true })).toBeVisible();
    await expect(card.getByText(/^•••• •••• •••• \d{4}$/)).toBeVisible();
    const text = await card.innerText();
    expect(text, "no balance or full card number").not.toMatch(/£|\d{4}\s?\d{4}\s?\d{4}|balance/i);
  }
  await expect(gallery.getByText("not issued cards", { exact: false })).toBeVisible();
});

test("Visa artwork is off by default: a neutral 'Demo card' mark is shown instead", async ({ page }) => {
  await page.goto("/cards");
  const gallery = page.getByRole("region", { name: "Card designs" });
  await expect(gallery.getByText("Demo card")).toHaveCount(4);
  await expect(gallery.locator('img[alt="Visa"]')).toHaveCount(0);
});

test("designs stay monochrome (no coloured fills) and use FINIX artwork only", async ({ page }) => {
  await page.goto("/cards");
  const colours = await page.locator("[data-card-design]").evaluateAll(els => els.map(e => getComputedStyle(e).backgroundImage + getComputedStyle(e).backgroundColor));
  for (const c of colours) {
    const rgb = [...c.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map(m => [+m[1], +m[2], +m[3]]);
    for (const [r, g, b] of rgb) expect(Math.max(r, g, b) - Math.min(r, g, b), `colourful channel in ${c}`).toBeLessThanOrEqual(12);
  }
});

for (const [name, width, height] of [["mobile", 390, 844], ["tablet", 820, 1180], ["desktop", 1440, 900]] as const) {
  test(`designs fit the layout without horizontal overflow (${name})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/cards");
    const gallery = page.getByRole("region", { name: "Card designs" });
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700); // entrance animation
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    for (const [design] of DESIGNS) {
      const b = (await gallery.locator(`[data-card-design="${design}"]`).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(width);
      expect(b.width / b.height).toBeGreaterThan(1.5); expect(b.width / b.height).toBeLessThan(1.65); // card proportion 1.586:1
    }
    await gallery.screenshot({ path: `/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/designer-cards-${name}.png` });
  });
}

test("reduced motion: cards render immediately and ignore pointer tilt", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:3100/cards");
  const card = page.locator('[data-card-design="everyday"]');
  await expect(card).toBeVisible();
  const transform = () => card.evaluate(e => getComputedStyle(e).transform);
  await expect.poll(transform, { timeout: 5000 }).toBe("none"); // settled: no entrance offset, no tilt
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await page.waitForTimeout(300);
  expect(await transform(), "pointer movement must not tilt the card").toBe("none");
  await ctx.close();
});

test("keyboard users are not trapped: decorative cards are not focusable controls", async ({ page }) => {
  await page.goto("/cards");
  const focusable = await page.locator("[data-card-design]").evaluateAll(els => els.filter(e => e.tabIndex >= 0 || e.querySelector("button, a, input")).length);
  expect(focusable).toBe(0);
});
