import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

function authenticatedSession(passwordResetRequired = false) {
  return {
    authenticated: true,
    user: {
      email: "owner@example.com",
      passwordResetRequired,
    },
    accessibleWorkspaces: [
      {
        ownerEmail: "owner@example.com",
        role: "owner",
      },
    ],
  };
}

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

  it("shows the login flow when there is no active session", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<App />);

    expect(await screen.findByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session");
  });

  it("logs in and loads the selected workspace", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authenticatedSession()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "1",
                title: "Ship auth flow",
                completed: false,
                ownerEmail: "owner@example.com",
                workspaceEmail: "owner@example.com",
              },
            ],
            workspaceEmail: "owner@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            workspaceEmail: "owner@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<App />);

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "owner-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Ship auth flow")).toBeInTheDocument();
    expect(screen.getByText(/owned by you/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/auth/login");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/todos?workspace=owner%40example.com");
    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/shares?workspace=owner%40example.com");
  });

  it("forces a password reset before workspace data loads", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authenticatedSession(true)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authenticatedSession(false)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            workspaceEmail: "owner@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            workspaceEmail: "owner@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<App />);

    expect(
      await screen.findByText(/replace the temporary password/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "temporary-password-123" },
    });
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "replacement-password-456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save password/i }));

    expect(
      await screen.findByRole("heading", { name: /shared queues, explicit owners/i }),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/auth/reset-password");
  });

  it("creates, shares, and updates todos inside the authenticated workspace", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authenticatedSession()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "1",
                title: "Existing task",
                completed: false,
                ownerEmail: "owner@example.com",
                workspaceEmail: "owner@example.com",
              },
            ],
            workspaceEmail: "owner@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            workspaceEmail: "owner@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "2",
            title: "Write invite flow",
            completed: false,
            ownerEmail: "owner@example.com",
            workspaceEmail: "owner@example.com",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workspaceEmail: "owner@example.com",
            email: "collab@example.com",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "1",
            title: "Existing task",
            completed: true,
            ownerEmail: "owner@example.com",
            workspaceEmail: "owner@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<App />);

    expect(await screen.findByText("Existing task")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/new todo/i), {
      target: { value: "Write invite flow" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add todo/i }));
    expect(await screen.findByText("Write invite flow")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/collaborator email/i), {
      target: { value: "collab@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /share workspace/i }));
    expect(await screen.findByText(/shared with collab@example.com/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mark existing task as done/i }));
    expect(
      await screen.findByRole("button", { name: /mark existing task as open/i }),
    ).toBeInTheDocument();

    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/todos");
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Write invite flow",
        workspaceEmail: "owner@example.com",
      }),
    });

    expect(fetchMock.mock.calls[4]?.[0]).toBe("/api/shares");
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceEmail: "owner@example.com",
        email: "collab@example.com",
      }),
    });

    expect(fetchMock.mock.calls[5]?.[0]).toBe("/api/todos/1");
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
  });
});
