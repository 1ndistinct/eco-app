import { expect, test } from "@playwright/test";

test("renders existing todos and creates a new one", async ({ page }) => {
  const title = `Playwright todo ${Date.now()}`;

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /todo list/i })).toBeVisible();
  await expect(page.getByText(/\d+\s+items remaining/i)).toBeVisible();

  await page.getByLabel(/new todo/i).fill(title);
  await page.getByRole("button", { name: /add todo/i }).click();

  const todoCard = page.getByRole("listitem").filter({ hasText: title });

  await expect(todoCard).toBeVisible();
  await todoCard.getByRole("button", { name: /mark done/i }).click();
  await expect(todoCard.getByText(/completed/i)).toBeVisible();
  await expect(todoCard.getByRole("button", { name: /reopen/i })).toBeVisible();
});
