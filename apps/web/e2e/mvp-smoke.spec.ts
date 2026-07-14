import { test, expect } from "@playwright/test";

test.describe("MVP 7-page smoke", () => {
  test("dashboard loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Trading Pi/);
  });
  test("each route renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    const routes = ["/", "/markets", "/workspace", "/journal", "/timeline", "/settings", "/evolution"];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});