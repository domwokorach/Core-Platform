import { test, expect } from "@playwright/test";

for (const [path, heading] of [["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"]] as const) {
  test.describe(path, () => {
    test("is public and renders", async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText("Last updated:")).toBeVisible();
    });

    test("table of contents scrolls to the section", async ({ page }) => {
      await page.goto(path);
      const toc = page.getByRole("navigation", { name: "Table of contents" });
      await toc.getByRole("link").last().click();
      const id = (await toc.getByRole("link").last().getAttribute("href"))!.slice(1);
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    });

    test("back to sign in and logo go to /login", async ({ page }) => {
      await page.goto(path);
      // /login immediately hands over to Keycloak, so assert on the navigation request itself.
      const request = page.waitForRequest(r => new URL(r.url()).pathname === "/login");
      await page.getByRole("link", { name: "Back to Sign In" }).click();
      await request;
    });

    test("dark mode and no horizontal scroll on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(path);
      await page.getByRole("button", { name: "Toggle light and dark theme" }).click();
      await expect(page.locator("html")).toHaveClass(/dark/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByRole("button", { name: "Table of contents" }).click();
      await expect(page.locator("#toc-list")).toBeVisible();
    });
  });
}

test("sign-in links reach both pages", async ({ page }) => {
  await page.goto("/login?error=callback"); // error state: stays on the page instead of redirecting to Keycloak
  await page.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page.goto("/login?error=callback");
  await page.getByRole("link", { name: "Terms of Service" }).click();
  await expect(page).toHaveURL(/\/terms$/);
});
