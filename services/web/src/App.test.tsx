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
        id: "workspace-1",
        name: "Personal",
        description: "Default workspace",
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
    vi.stubGlobal("confirm", vi.fn(() => true));
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

  it("shows the Google login action when the session bootstrap exposes it", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authenticated: false,
          googleLoginEnabled: true,
          googleLoginURL: "https://eco.treehousehl.com/api/auth/google/start",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(<App />);

    const googleLink = await screen.findByRole("link", { name: /continue with google/i });
    expect(googleLink).toHaveAttribute(
      "href",
      "https://eco.treehousehl.com/api/auth/google/start",
    );
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
                workspaceId: "workspace-1",
              },
            ],
            workspaceId: "workspace-1",
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
            workspaceId: "workspace-1",
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
    expect(screen.getByRole("tab", { name: /personal/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/auth/login");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/todos?workspace=workspace-1");
    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/shares?workspace=workspace-1");
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
            workspaceId: "workspace-1",
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
            workspaceId: "workspace-1",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<App />);

    expect(await screen.findByText(/choose a password to finish setup/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "replacement-password-456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save password/i }));

    expect(
      await screen.findByRole("heading", { name: /named queues, explicit owners/i }),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/auth/reset-password");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPassword: "replacement-password-456",
      }),
    });
  });

  it("reloads the signed-out session after logout so Google login remains available", async () => {
    let sessionRequestCount = 0;
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/auth/session") {
        sessionRequestCount += 1;

        if (sessionRequestCount === 1) {
          return new Response(JSON.stringify(authenticatedSession()), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            authenticated: false,
            googleLoginEnabled: true,
            googleLoginURL: "https://eco.treehousehl.com/api/auth/google/start",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url === "/api/todos?workspace=workspace-1") {
        return new Response(
          JSON.stringify({
            items: [],
            workspaceId: "workspace-1",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url === "/api/shares?workspace=workspace-1") {
        return new Response(
          JSON.stringify({
            items: [],
            workspaceId: "workspace-1",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url === "/api/auth/logout") {
        return new Response(null, { status: 204 });
      }

      throw new Error(`unexpected fetch: ${url}`);
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /log out/i }));

    const googleLink = await screen.findByRole("link", { name: /continue with google/i });
    expect(googleLink).toHaveAttribute(
      "href",
      "https://eco.treehousehl.com/api/auth/google/start",
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session");
    expect(sessionRequestCount).toBe(2);
  });

  it("creates, shares, updates, and deletes todos inside the authenticated workspace", async () => {
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
                workspaceId: "workspace-1",
              },
            ],
            workspaceId: "workspace-1",
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
            workspaceId: "workspace-1",
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
            workspaceId: "workspace-1",
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
            workspaceId: "workspace-1",
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
            workspaceId: "workspace-1",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

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

    fireEvent.click(screen.getByRole("button", { name: /delete write invite flow/i }));
    await waitFor(() => {
      expect(screen.queryByText("Write invite flow")).not.toBeInTheDocument();
    });

    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/todos");
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Write invite flow",
        workspaceId: "workspace-1",
      }),
    });

    expect(fetchMock.mock.calls[4]?.[0]).toBe("/api/shares");
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "workspace-1",
        email: "collab@example.com",
      }),
    });

    expect(fetchMock.mock.calls[5]?.[0]).toBe("/api/todos/1");
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    expect(fetchMock.mock.calls[6]?.[0]).toBe("/api/todos/2");
    expect(fetchMock.mock.calls[6]?.[1]).toMatchObject({
      method: "DELETE",
    });
  });

  it("creates and deletes an owned workspace", async () => {
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
            items: [],
            workspaceId: "workspace-1",
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
            workspaceId: "workspace-1",
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
            id: "workspace-2",
            name: "Launch Queue",
            description: "Track rollout work.",
            ownerEmail: "owner@example.com",
            role: "owner",
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
            items: [],
            workspaceId: "workspace-2",
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
            workspaceId: "workspace-2",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [],
            workspaceId: "workspace-1",
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
            workspaceId: "workspace-1",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<App />);

    await screen.findByRole("heading", { name: /named queues, explicit owners/i });

    fireEvent.change(screen.getByLabelText(/workspace name/i), {
      target: { value: "Launch Queue" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Track rollout work." },
    });
    fireEvent.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/created launch queue/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /launch queue/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete workspace/i }));
    expect(await screen.findByText(/deleted launch queue/i)).toBeInTheDocument();

    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/workspaces");
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Launch Queue",
        description: "Track rollout work.",
      }),
    });

    expect(fetchMock.mock.calls[6]?.[0]).toBe("/api/workspaces/workspace-2");
    expect(fetchMock.mock.calls[6]?.[1]).toMatchObject({
      method: "DELETE",
    });
  });
});
