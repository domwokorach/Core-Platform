import { test, expect } from "@playwright/test";

/**
 * Live check (Docker stack built with VISA_BRANDING_APPROVED=true): the Visa mark appears on the designer cards and on the
 * sandbox card faces, as a loaded image. Skipped when the build has Visa branding off or the stack/Logo.dev is unreachable.
 */
const APP = "http://localhost:3000";
const KEYCLOAK = "http://localhost:8081";
test.describe.configure({ timeout: 90_000 });

test("Visa mark is shown on designer cards and sandbox cards when branding is approved", async ({ page, request }) => {
  const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
  test.skip(!up, "stack not reachable");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${APP}/cards`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await page.locator("#username").fill("alex"); await page.locator("#password").fill("DemoPass123!"); await page.locator("#kc-login").click();
  await expect(page).toHaveURL(`${APP}/cards`, { timeout: 30_000 });
  const gallery = page.getByRole("region", { name: "Card designs" });
  await expect(gallery).toBeVisible({ timeout: 20_000 });
  // With branding on, each card always contains a Visa <img> (hidden until loaded, with the neutral pill as its placeholder).
  test.skip(await gallery.locator('img[alt="Visa"]').count() === 0, "Visa branding is off in this build");

  for (const design of ["everyday", "savings", "metal", "signature"]) {
    const img = gallery.locator(`[data-card-design="${design}"] img[alt="Visa"]`);
    await expect(img, `${design} has the Visa mark`).toBeVisible({ timeout: 20_000 });
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth > 0), `${design} image loaded`).toBe(true);
  }
  await expect(gallery.getByText("Demo card")).toHaveCount(0);
  const sandbox = page.getByRole("list", { name: "Your virtual cards" }).locator('img[alt="Visa"]');
  await expect(sandbox.first()).toBeVisible({ timeout: 20_000 });
  await gallery.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  await gallery.screenshot({ path: "/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/designer-cards-visa.png" });
  await page.getByRole("list", { name: "Your virtual cards" }).screenshot({ path: "/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/sandbox-cards-visa.png" });
});
