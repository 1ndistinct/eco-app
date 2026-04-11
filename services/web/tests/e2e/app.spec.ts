import { expect, test } from "@playwright/test";

test("renders existing todos and creates a new one", async ({ page }) => {
  const todos = [{ id: "1", title: "Existing todo", completed: false }];

  await page.route("**/api/todos", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: todos }),
      });
      return;
    }

    if (request.method() === "POST") {
      const payload = request.postDataJSON() as { title?: string };
      const createdTodo = {
        id: "2",
        title: payload.title ?? "",
        completed: false,
      };
      todos.push(createdTodo);

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(createdTodo),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /todo list/i })).toBeVisible();
  await expect(page.getByText("Existing todo")).toBeVisible();

  await page.getByLabel(/new todo/i).fill("Add Playwright coverage");
  await page.getByRole("button", { name: /add todo/i }).click();

  await expect(page.getByText("Add Playwright coverage")).toBeVisible();
  await expect(page.getByText(/2 items remaining/i)).toBeVisible();
});
