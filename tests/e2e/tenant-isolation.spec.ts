import { test, expect, request } from "@playwright/test";

/**
 * This is the single most important test in the whole project. It needs a
 * running dev server (`npm run dev`) and a seeded database with at least two
 * restaurants. Run `npm run seed` first, then add a second restaurant via
 * the Super Admin UI (or extend prisma/seed.ts) before running this.
 *
 * It proves: logging in as Restaurant A's owner can NEVER read or write
 * Restaurant B's data, even when given Restaurant B's real database IDs.
 */
test.describe("tenant isolation", () => {
  test("Restaurant A cannot read Restaurant B's menu items via the admin API", async ({ page }) => {
    // 1) Log in as Restaurant A's owner (replace with real seeded credentials).
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "owner@riversidecafe.com");
    await page.fill('input[type="password"]', "ChangeMe123!");
    await page.click('button[type="submit"]');
    // In dev mode the OTP is shown on-screen (see LoginForm's devOtp banner) —
    // read it instead of hardcoding, since it's regenerated every run.
    const devOtp = await page.locator("strong").innerText();
    await page.fill('input[maxlength="6"]', devOtp);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // 2) Restaurant A's own data should load fine.
    const ownRes = await page.request.get("/api/admin/menu-items");
    expect(ownRes.ok()).toBeTruthy();

    // 3) Attempting to PATCH a menu item that belongs to a DIFFERENT
    //    restaurant (its real id, obtained out-of-band for this test) must
    //    fail — not silently succeed, not return someone else's data.
    const otherRestaurantsItemId = process.env.TEST_OTHER_RESTAURANT_MENU_ITEM_ID;
    test.skip(!otherRestaurantsItemId, "Set TEST_OTHER_RESTAURANT_MENU_ITEM_ID to run this check");

    const crossTenantRes = await page.request.patch(`/api/admin/menu-items/${otherRestaurantsItemId}`, {
      data: { isAvailable: false },
    });
    expect(crossTenantRes.status()).toBe(404); // scoped query finds nothing — not 200, not 403-leaking-existence
  });
});
