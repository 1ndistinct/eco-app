import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TodoFeatureUnavailableState } from "./TodoFeatureHost";

describe("TodoFeatureUnavailableState", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("polls the remote entry and notifies when it becomes available", async () => {
    let unmount: (() => void) | undefined;
    const onRecovered = vi.fn(() => {
      unmount?.();
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    global.fetch = fetchMock as typeof fetch;

    const view = render(
      <TodoFeatureUnavailableState
        errorMessage="Unable to load the todo app."
        onRecovered={onRecovered}
        pollUrl="/todo/remoteEntry.js"
        retryIntervalMs={10}
      />,
    );
    unmount = view.unmount;

    expect(screen.getByText("Todo app unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Waiting for the todo module to come back and checking again every few seconds."),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(onRecovered).toHaveBeenCalledTimes(1);
    });
  });
});
