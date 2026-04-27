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

function authenticatedSessionWithWorkspaces(workspaces: object[], passwordResetRequired = false) {
  return {
    authenticated: true,
    user: {
      email: "owner@example.com",
      passwordResetRequired,
    },
    accessibleWorkspaces: workspaces,
  };
}

function workspaceItemsResponse(items: object[] = [], workspaceId = "workspace-1") {
  return new Response(
    JSON.stringify({
      items,
      workspaceId,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("App", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    setMatchMedia(false);
    window.history.replaceState({}, "", "/");
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
    expect(googleLink).toHaveAttribute("href", "https://eco.treehousehl.com/api/auth/google/start");
  });

  it("logs in and loads the selected workspace", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url === "/api/auth/session") {
        return new Response(JSON.stringify({ authenticated: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url === "/api/auth/login") {
        return new Response(JSON.stringify(authenticatedSession()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url === "/api/todos?workspace=workspace-1") {
        return new Response(
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
        );
      }

      if (url === "/api/shares?workspace=workspace-1") {
        return workspaceItemsResponse([], "workspace-1");
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App />);

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "owner-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Ship auth flow")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /open workspace selector/i }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Personal · owner@example.com");
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();
    expect(screen.getByText(/^owner@example\.com$/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/todo/workspaces/workspace-1");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/auth/login");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      expect.arrayContaining([
        "/api/todos?workspace=workspace-1",
        "/api/shares?workspace=workspace-1",
      ]),
    );
  });

  it("loads the workspace selected in the URL path on refresh", async () => {
    window.history.replaceState({}, "", "/todo/workspaces/workspace-2");

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            authenticatedSessionWithWorkspaces([
              {
                id: "workspace-1",
                name: "Personal",
                description: "Default workspace",
                ownerEmail: "owner@example.com",
                role: "owner",
              },
              {
                id: "workspace-2",
                name: "Launch Queue",
                description: "Track rollout work.",
                ownerEmail: "owner@example.com",
                role: "owner",
              },
            ]),
          ),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(workspaceItemsResponse([], "workspace-2"))
      .mockResolvedValueOnce(workspaceItemsResponse([], "workspace-2"));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /open workspace selector/i }));
    expect(await screen.findByRole("combobox")).toHaveTextContent(
      "Launch Queue · owner@example.com",
    );
    expect(window.location.pathname).toBe("/todo/workspaces/workspace-2");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      expect.arrayContaining([
        "/api/todos?workspace=workspace-2",
        "/api/shares?workspace=workspace-2",
      ]),
    );
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

    fireEvent.click(await screen.findByRole("button", { name: /open workspace selector/i }));
    expect(await screen.findByRole("combobox")).toHaveTextContent("Personal · owner@example.com");
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();
    expect(screen.getByText(/^owner@example\.com$/i)).toBeInTheDocument();
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
    expect(googleLink).toHaveAttribute("href", "https://eco.treehousehl.com/api/auth/google/start");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session");
    expect(sessionRequestCount).toBe(2);
  });

  it("creates, edits, shares, updates, and deletes todos inside the workspace app", async () => {
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
                createdAt: "2026-04-24T09:00:00.000Z",
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
            createdAt: "2026-04-25T11:30:00.000Z",
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
            id: "2",
            title: "Write invite emails",
            completed: false,
            ownerEmail: "owner@example.com",
            workspaceId: "workspace-1",
            createdAt: "2026-04-25T11:30:00.000Z",
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
            createdAt: "2026-04-24T09:00:00.000Z",
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
    expect(screen.getByRole("list", { name: /todo items/i })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /done items/i })).not.toBeInTheDocument();
    expect(screen.getByText(/created /i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/collaborator email/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    fireEvent.change(screen.getByLabelText(/new todo/i), {
      target: { value: "Write invite flow" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText("Write invite flow")).toBeInTheDocument();

    let createdTodo = screen.getByText("Write invite flow").closest("li");
    if (!createdTodo) {
      throw new Error("created todo row not found");
    }
    fireEvent.click(within(createdTodo).getByRole("button", { name: /^edit$/i, hidden: true }));
    fireEvent.change(within(createdTodo).getByLabelText(/todo title/i), {
      target: { value: "Write invite emails" },
    });
    fireEvent.click(within(createdTodo).getByRole("button", { name: /^save$/i, hidden: true }));
    expect(await screen.findByText("Write invite emails")).toBeInTheDocument();
    expect(screen.queryByText("Write invite flow")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open collaborators/i }));
    fireEvent.change(screen.getByLabelText(/collaborator email/i), {
      target: { value: "collab@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add collaborator/i }));
    expect(await screen.findByText(/shared with collab@example.com/i)).toBeInTheDocument();

    const existingTodo = screen.getByText("Existing task").closest("li");
    if (!existingTodo) {
      throw new Error("existing todo row not found");
    }
    fireEvent.click(within(existingTodo).getByRole("button", { name: /mark done/i, hidden: true }));
    await waitFor(() => {
      expect(screen.getByRole("list", { name: /done items/i, hidden: true })).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("list", { name: /done items/i, hidden: true })).getByText(
        "Existing task",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: /todo items/i, hidden: true })).queryByText(
        "Existing task",
      ),
    ).not.toBeInTheDocument();

    createdTodo = screen.getByText("Write invite emails").closest("li");
    if (!createdTodo) {
      throw new Error("created todo row not found");
    }
    fireEvent.click(within(createdTodo).getByRole("button", { name: /delete/i, hidden: true }));
    await waitFor(() => {
      expect(screen.queryByText("Write invite emails")).not.toBeInTheDocument();
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

    expect(fetchMock.mock.calls[4]?.[0]).toBe("/api/todos/2");
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Write invite emails",
      }),
    });

    expect(fetchMock.mock.calls[5]?.[0]).toBe("/api/shares");
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "workspace-1",
        email: "collab@example.com",
      }),
    });

    expect(fetchMock.mock.calls[6]?.[0]).toBe("/api/todos/1");
    expect(fetchMock.mock.calls[6]?.[1]).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    expect(fetchMock.mock.calls[7]?.[0]).toBe("/api/todos/2");
    expect(fetchMock.mock.calls[7]?.[1]).toMatchObject({
      method: "DELETE",
    });
  });

  it("lists collaborators in the header dropdown and removes them without exposing owner deletion", async () => {
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
            items: [{ workspaceId: "workspace-1", email: "collab@example.com" }],
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

    fireEvent.click(await screen.findByRole("button", { name: /open workspace selector/i }));
    expect(await screen.findByRole("combobox")).toHaveTextContent("Personal · owner@example.com");

    fireEvent.click(screen.getByRole("button", { name: /open collaborators/i }));

    expect(await screen.findByText("collab@example.com")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove owner@example.com/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove collab@example.com/i }));

    await waitFor(() => {
      expect(screen.queryByText("collab@example.com")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/removed collab@example.com/i)).toBeInTheDocument();

    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/shares");
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "workspace-1",
        email: "collab@example.com",
      }),
    });
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

    fireEvent.click(await screen.findByRole("button", { name: /open workspace selector/i }));
    await screen.findByRole("combobox");

    fireEvent.click(screen.getByRole("button", { name: /create workspace/i }));
    fireEvent.change(await screen.findByLabelText(/workspace name/i), {
      target: { value: "Launch Queue" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Track rollout work." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add workspace$/i }));

    expect(await screen.findByText(/created launch queue/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByLabelText(/workspace name/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole("combobox")).toHaveTextContent("Launch Queue · owner@example.com");
    expect(window.location.pathname).toBe("/todo/workspaces/workspace-2");

    fireEvent.click(screen.getByRole("button", { name: /open settings/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^settings$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^delete workspace$/i }));

    expect(await screen.findByText(/deleted launch queue/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/todo/workspaces/workspace-1");

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

  it("updates the URL when switching workspaces", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            authenticatedSessionWithWorkspaces([
              {
                id: "workspace-1",
                name: "Personal",
                description: "Default workspace",
                ownerEmail: "owner@example.com",
                role: "owner",
              },
              {
                id: "workspace-2",
                name: "Launch Queue",
                description: "Track rollout work.",
                ownerEmail: "owner@example.com",
                role: "owner",
              },
            ]),
          ),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(workspaceItemsResponse())
      .mockResolvedValueOnce(workspaceItemsResponse())
      .mockResolvedValueOnce(workspaceItemsResponse([], "workspace-2"))
      .mockResolvedValueOnce(workspaceItemsResponse([], "workspace-2"));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /open workspace selector/i }));

    const workspaceSelect = await screen.findByRole("combobox");
    fireEvent.mouseDown(workspaceSelect);
    fireEvent.click(
      await screen.findByRole("option", { name: "Launch Queue · owner@example.com" }),
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe("/todo/workspaces/workspace-2");
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      expect.arrayContaining([
        "/api/todos?workspace=workspace-2",
        "/api/shares?workspace=workspace-2",
      ]),
    );
  });

  it("keeps desktop navigation collapsed by default and opens the workspace selector on demand", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authenticatedSession()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(workspaceItemsResponse())
      .mockResolvedValueOnce(workspaceItemsResponse());

    render(<App />);

    const selectorButton = await screen.findByRole("button", {
      name: /open workspace selector/i,
    });
    const createWorkspaceButton = screen.getByRole("button", { name: /create workspace/i });
    const collaboratorsButton = screen.getByRole("button", { name: /open collaborators/i });
    const settingsButton = screen.getByRole("button", { name: /open settings/i });
    const todosButton = screen.getByRole("button", { name: /open todos app/i });

    expect(selectorButton).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      createWorkspaceButton.compareDocumentPosition(todosButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      collaboratorsButton.compareDocumentPosition(todosButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      todosButton.compareDocumentPosition(settingsButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /open todos app/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open workspace menu/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Default workspace")).not.toBeInTheDocument();

    fireEvent.click(selectorButton);

    expect(
      screen.getByRole("button", { name: /collapse workspace selector/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Personal · owner@example.com");
  });

  it("shows a mobile workspace menu with workspace and app navigation", async () => {
    setMatchMedia(true);

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authenticatedSession()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(workspaceItemsResponse())
      .mockResolvedValueOnce(workspaceItemsResponse());

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /open workspace menu/i }));

    expect(await screen.findByRole("heading", { name: /workspace menu/i })).toBeInTheDocument();
    expect(document.body.querySelector(".workspace-mobile-drawer")).not.toBeNull();
    expect(screen.getByText("Workspaces")).toBeInTheDocument();
    expect(screen.getAllByText("Personal").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /create workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open settings/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^todos$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /workspace menu/i })).not.toBeInTheDocument();
    });
  });
});
