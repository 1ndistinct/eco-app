import { expect, test } from "@playwright/test";

test.skip("renders the first product slice", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/TODO: define the first product slice here./i)).toBeVisible();
});
