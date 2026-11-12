import { test, expect } from "@playwright/test";

/**
 * Live check (Docker stack built with VISA_BRANDING_APPROVED=true): the supplied Black/Silver card artwork (Visa mark included)
 * loads whole. Skipped when the stack is unreachable.
 */
const APP = "http://localhost:3000";
const KEYCLOAK = "http://localhost:8081";
test.describe.configure({ timeout: 90_000 });

test("the sandbox card artwork (with its Visa mark) loads", async ({ page, request }) => {
  const up = await request.get(`${KEYCLOAK}/realms/finix/.well-known/openid-configuration`, { timeout: 5000 }).then(r => r.ok(), () => false);
  test.skip(!up, "stack not reachable");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${APP}/cards`);
  await page.waitForURL(`${KEYCLOAK}/**`);
  await page.locator("#username").fill("alex"); await page.locator("#password").fill("DemoPass123!"); await page.locator("#kc-login").click();
  await expect(page).toHaveURL(`${APP}/cards`, { timeout: 30_000 });
  // The sandbox cards use the supplied Visa artwork (the Visa mark is part of the image): both card images must load whole.
  for (const alt of ["FINIX Black Visa card", "FINIX Silver Visa card"]) {
    const art = page.getByRole("list", { name: "Your virtual cards" }).getByRole("img", { name: alt }).first();
    await expect(art, alt).toBeVisible({ timeout: 20_000 });
    expect(await art.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), `${alt} loaded`).toBe(true);
  }
  await page.getByRole("list", { name: "Your virtual cards" }).screenshot({ path: "/var/folders/1g/28s9xk4s51qblm98xrykytp40000gn/T/shots/sandbox-cards-visa.png" });
});
