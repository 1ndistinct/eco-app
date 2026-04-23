import { expect, test } from "@playwright/test";

const loginEmail = process.env.PLAYWRIGHT_LOGIN_EMAIL;
const loginPassword = process.env.PLAYWRIGHT_LOGIN_PASSWORD;
const resetPassword = process.env.PLAYWRIGHT_RESET_PASSWORD ?? `${loginPassword ?? "password"}-reset`;

test("renders an authenticated workspace, creates a todo, and completes it", async ({ page }) => {
  test.skip(!loginEmail || !loginPassword, "Set PLAYWRIGHT_LOGIN_EMAIL and PLAYWRIGHT_LOGIN_PASSWORD to run the authenticated flow.");

  const title = `Playwright todo ${Date.now()}`;

  await page.goto("/");

  await page.getByLabel(/email/i).fill(loginEmail!);
  await page.getByLabel(/^password$/i).fill(loginPassword!);
  await page.getByRole("button", { name: /log in/i }).click();

  const needsPasswordReset = await page
    .getByText(/choose a password to finish setup/i)
    .isVisible()
    .catch(() => false);

  if (needsPasswordReset) {
    await page.getByLabel(/new password/i).fill(resetPassword);
    await page.getByRole("button", { name: /save password/i }).click();
  }

  await expect(page.getByRole("heading", { name: /shared queues, explicit owners/i })).toBeVisible();
  await expect(page.getByText(/\d+\s+items remaining/i)).toBeVisible();

  await page.getByLabel(/new todo/i).fill(title);
  await page.getByRole("button", { name: /add todo/i }).click();

  const todoCard = page.getByRole("listitem").filter({ hasText: title });

  await expect(todoCard).toBeVisible();
  await expect(todoCard.getByText(/owned by you/i)).toBeVisible();
  await todoCard.getByRole("button", { name: /mark done/i }).click();
  await expect(todoCard.getByText(/completed/i)).toBeVisible();
  await expect(todoCard.getByRole("button", { name: /reopen/i })).toBeVisible();
  await todoCard.getByRole("button", { name: new RegExp(`delete ${title}`, "i") }).click();
  await expect(todoCard).toHaveCount(0);
});
