import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TodoFeature from "./TodoFeature";

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  readonly url: string;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emitMessage(data: string) {
    this.onmessage?.(new MessageEvent("message", { data }) as MessageEvent<string>);
  }
}

function workspaceItemsResponse({
  todoItems,
  doneItems,
  workspaceId = "workspace-1",
}: {
  todoItems?: object[];
  doneItems?: object[];
  workspaceId?: string;
}) {
  return new Response(
    JSON.stringify({
      todoItems,
      doneItems,
      workspaceId,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

describe("TodoFeature", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    FakeEventSource.instances = [];
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("refetches todos when the stream receives an event", async () => {
    fetchMock
      .mockResolvedValueOnce(
        workspaceItemsResponse({
          todoItems: [
            {
              id: "1",
              title: "Ship auth flow",
              completed: false,
              ownerEmail: "owner@example.com",
              workspaceId: "workspace-1",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        workspaceItemsResponse({
          todoItems: [
            {
              id: "1",
              title: "Ship auth flow",
              completed: false,
              ownerEmail: "owner@example.com",
              workspaceId: "workspace-1",
            },
            {
              id: "2",
              title: "Review realtime updates",
              completed: false,
              ownerEmail: "owner@example.com",
              workspaceId: "workspace-1",
            },
          ],
        }),
      );

    const view = render(
      <TodoFeature
        workspaceId="workspace-1"
        workspaceName="Personal"
        currentUserEmail="owner@example.com"
      />,
    );

    expect(await screen.findByText("Ship auth flow")).toBeTruthy();
    expect(FakeEventSource.instances[0]?.url).toBe("/api/todos/stream?workspace=workspace-1");

    FakeEventSource.instances[0]?.emitMessage(
      JSON.stringify({
        type: "todo.created",
        workspaceId: "workspace-1",
        todoId: "2",
      }),
    );

    expect(await screen.findByText("Review realtime updates")).toBeTruthy();

    view.unmount();
    expect(FakeEventSource.instances[0]?.closed).toBe(true);
  });

  it("renders server-provided todo and done sections with edit actions", async () => {
    fetchMock.mockResolvedValueOnce(
      workspaceItemsResponse({
        todoItems: [
          {
            id: "1",
            title: "Older open task",
            completed: false,
            ownerEmail: "owner@example.com",
            workspaceId: "workspace-1",
            createdAt: "2026-04-28T10:00:00Z",
          },
          {
            id: "2",
            title: "Newer open task",
            completed: false,
            ownerEmail: "owner@example.com",
            workspaceId: "workspace-1",
            createdAt: "2026-04-28T10:05:00Z",
          },
        ],
        doneItems: [
          {
            id: "3",
            title: "Done task",
            completed: true,
            ownerEmail: "owner@example.com",
            workspaceId: "workspace-1",
            createdAt: "2026-04-28T10:10:00Z",
          },
        ],
      }),
    );

    render(
      <TodoFeature
        workspaceId="workspace-1"
        workspaceName="Personal"
        currentUserEmail="owner@example.com"
      />,
    );

    expect(await screen.findByText("Todo")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
    expect(screen.getByText("Older open task")).toBeTruthy();
    expect(screen.getByText("Newer open task")).toBeTruthy();
    expect(screen.getByText("Done task")).toBeTruthy();
    expect(screen.getAllByText(/created /i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /edit title/i }).length).toBeGreaterThan(0);

    const todoListItems = within(screen.getByRole("list", { name: /todo items/i })).getAllByRole(
      "listitem",
    );
    expect(todoListItems).toHaveLength(2);
    expect(within(todoListItems[0]!).getByText("Older open task")).toBeTruthy();
    expect(within(todoListItems[1]!).getByText("Newer open task")).toBeTruthy();
  });
});
