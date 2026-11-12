import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/transactions", "/transfers", "/accounts", "/analytics", "/cards", "/goals", "/investments", "/notifications", "/settings"];

/** Chrome (sidebar, header, cards, buttons, forms, tables…) must be grey. Accents are allowed only inside [data-accent] regions. Returns every distinct chromatic (non grey) colour found in computed styles on the page. */
async function chromaticColours(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const props = ["color", "backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor", "fill", "stroke", "backgroundImage", "boxShadow", "textDecorationColor", "caretColor"];
    const found = new Map<string, string>();
    const canvas = document.createElement("canvas").getContext("2d")!;
    // Normalise ANY CSS colour syntax (rgb, oklch, color(), lab…) to sRGB via canvas.
    const toRgb = (c: string): [number, number, number, number] | null => {
      canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = "#000"; canvas.fillStyle = c; canvas.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = canvas.getImageData(0, 0, 1, 1).data; return [r!, g!, b!, a!];
    };
    const re = /(rgba?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)|color\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8}\b)/gi;
    for (const el of document.querySelectorAll("body, body *")) {
      if (el.closest("[data-accent]")) continue; // sanctioned accent regions: charts, stat indicators, status badges, insight figures
      const cs = getComputedStyle(el);
      for (const p of props) {
        const v = (cs as unknown as Record<string, string>)[p];
        if (!v || v === "none") continue;
        for (const m of v.match(re) ?? []) {
          const rgb = toRgb(m); if (!rgb || rgb[3] === 0) continue;
          if (Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]) > 3)
            found.set(m, `${el.tagName.toLowerCase()}.${String(el.getAttribute("class") ?? "").slice(0, 40)} ${p}`);
        }
      }
    }
    return [...found.entries()].map(([c, where]) => `${c} @ ${where}`);
  });
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme: chrome is monochrome outside accent regions`, () => {
    test.use({ colorScheme: scheme });
    for (const route of ROUTES) {
      test(route, async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(route);
        await page.waitForTimeout(1500); // charts + entrance animations
        // open interactive surfaces that render in portals
        await page.getByRole("button", { name: "Open profile menu" }).click();
        await page.waitForTimeout(300);
        expect(await chromaticColours(page), "chromatic colours found").toEqual([]);
      });
    }
  });
}

test("status badges are distinguishable without colour", async ({ page }) => {
  await page.goto("/transactions");
  await page.waitForTimeout(1000);
  await expect(page.getByText("Completed").first()).toBeVisible();
  const badge = page.getByText("Completed").first();
  await expect(badge.locator("svg")).toHaveCount(1); // check icon accompanies the label
});

test("accents are present in charts, and stay a small share of the screen (≈85–90% neutral)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await page.waitForTimeout(2000);
    const fills = await page.evaluate(() => [...document.querySelectorAll("figure[data-accent] svg *")].map(e => getComputedStyle(e).fill + "|" + getComputedStyle(e).stroke).join(" "));
    expect(fills, "balance line uses profit blue").toContain("rgb(59, 130, 246)");
    expect(fills, "income bars use emerald").toContain("rgb(16, 185, 129)");
    expect(fills, "spending uses coral").toContain("rgb(248, 113, 113)");
    const png = (await page.screenshot({ fullPage: true })).toString("base64");
    const share = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data; let col = 0;
      for (let i = 0; i < d.length; i += 4) if (Math.max(d[i]!, d[i + 1]!, d[i + 2]!) - Math.min(d[i]!, d[i + 1]!, d[i + 2]!) > 24) col++;
      return col / (d.length / 4);
    }, png);
    expect(share, `${scheme}: coloured pixel share`).toBeLessThan(0.1);
  }
});

test("insight figures are accented but carry arrows/words, not colour alone", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  const insights = page.getByRole("heading", { name: "Insights" }).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await expect(insights).toContainText("Income was £");
  await expect(insights).toContainText("You kept £");
});
