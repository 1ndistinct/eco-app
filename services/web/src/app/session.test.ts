import { describe, expect, it } from "vitest";

import { normalizeSessionState } from "./session";

describe("normalizeSessionState", () => {
  it("deduplicates repeated workspace entries by id and prefers the owner role", () => {
    const state = normalizeSessionState({
      authenticated: true,
      accessibleWorkspaces: [
        {
          id: "workspace-1",
          name: "Personal",
          description: "Default workspace",
          ownerEmail: "owner@example.com",
          role: "collaborator",
        },
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
      ],
    });

    expect(state.accessibleWorkspaces).toEqual([
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
    ]);
  });
});
