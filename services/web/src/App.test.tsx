import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.getByRole("combobox")).toHaveTextContent("Personal · owner@example.com");
    expect(screen.getByRole("heading", { name: "Personal" })).toBeInTheDocument();

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

    expect(await screen.findByText(/set password/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "replacement-password-456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save password/i }));

    expect(await screen.findByRole("heading", { name: /workspaces/i })).toBeInTheDocument();
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

  it("creates, shares, updates, and deletes todos inside the workspace app", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    fireEvent.change(screen.getByLabelText(/new todo/i), {
      target: { value: "Write invite flow" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText("Write invite flow")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/collaborator email/i), {
      target: { value: "collab@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add collaborator/i }));
    expect(await screen.findByText(/shared with collab@example.com/i)).toBeInTheDocument();

    const existingTodo = screen.getByText("Existing task").closest("li");
    if (!existingTodo) {
      throw new Error("existing todo row not found");
    }
    fireEvent.click(within(existingTodo).getByRole("button", { name: /mark done/i }));
    await waitFor(() => {
      expect(within(existingTodo).getByRole("button", { name: /reopen/i })).toBeInTheDocument();
    });

    const createdTodo = screen.getByText("Write invite flow").closest("li");
    if (!createdTodo) {
      throw new Error("created todo row not found");
    }
    fireEvent.click(within(createdTodo).getByRole("button", { name: /delete/i }));
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

  it("switches to the notes app from the collapsed sidebar and adds a local note", async () => {
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
      );

    render(<App />);

    await screen.findByRole("heading", { name: /workspaces/i });

    fireEvent.click(screen.getByRole("button", { name: /open notes app/i }));
    expect(await screen.findByRole("button", { name: /add note/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add note/i }));
    fireEvent.change(screen.getByLabelText(/note title/i), {
      target: { value: "Release notes" },
    });
    fireEvent.change(screen.getByLabelText(/^note$/i), {
      target: { value: "Track deployment caveats here." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("Release notes")).toBeInTheDocument();
    expect(screen.getByText("Track deployment caveats here.")).toBeInTheDocument();
  });

  it("creates a workspace from the header and deletes it from settings", async () => {
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

    await screen.findByRole("heading", { name: /workspaces/i });

    fireEvent.click(screen.getByRole("button", { name: /create workspace/i }));
    fireEvent.change(await screen.findByLabelText(/workspace name/i), {
      target: { value: "Launch Queue" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Track rollout work." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create workspace$/i }));

    expect(await screen.findByText(/created launch queue/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /create workspace/i })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("combobox")).toHaveTextContent("Launch Queue · owner@example.com");

    fireEvent.click(screen.getByRole("button", { name: /workspace settings/i }));
    expect(await screen.findByRole("heading", { name: /workspace settings/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^delete workspace$/i }));

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
