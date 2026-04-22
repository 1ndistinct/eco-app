import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("App", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads and renders todos from the API", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: "1", title: "Ship frontend", completed: false }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<App />);

    expect(screen.getByText(/loading todos/i)).toBeInTheDocument();
    expect(await screen.findByText("Ship frontend")).toBeInTheDocument();
    expect(screen.getByText(/1 items remaining/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/todos");
  });

  it("creates a todo through the API and appends it to the list", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "2", title: "Write UI", completed: false }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<App />);

    await screen.findByText(/no todos yet/i);

    fireEvent.change(screen.getByLabelText(/new todo/i), {
      target: { value: "Write UI" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));

    expect(await screen.findByText("Write UI")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/todos");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Write UI" }),
    });
    expect(screen.getByText(/1 items remaining/i)).toBeInTheDocument();
  });

  it("blocks blank titles before sending a create request", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<App />);

    await screen.findByText(/no todos yet/i);

    fireEvent.change(screen.getByLabelText(/new todo/i), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/title is required/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a load error when the API request fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/network down/i);
  });

  it("marks a todo as completed through the API", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: "1", title: "Ship frontend", completed: false }],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "1", title: "Ship frontend", completed: true }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<App />);

    await screen.findByText("Ship frontend");

    fireEvent.click(screen.getByRole("button", { name: /mark ship frontend as done/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/todos/1");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(await screen.findByRole("button", { name: /mark ship frontend as open/i })).toBeInTheDocument();
    expect(screen.getByText(/0 items remaining/i)).toBeInTheDocument();
  });
});
