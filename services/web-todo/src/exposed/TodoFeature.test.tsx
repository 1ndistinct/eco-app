import { cleanup, render, screen } from "@testing-library/react";
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

function workspaceItemsResponse(items: object[], workspaceId = "workspace-1") {
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
        workspaceItemsResponse([
          {
            id: "1",
            title: "Ship auth flow",
            completed: false,
            ownerEmail: "owner@example.com",
            workspaceId: "workspace-1",
          },
        ]),
      )
      .mockResolvedValueOnce(
        workspaceItemsResponse([
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
        ]),
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
});
