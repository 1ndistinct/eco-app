export type WorkspaceAppId = "todo" | "nicole";

export type WorkspaceAppDefinition = {
  id: WorkspaceAppId;
  label: string;
  ariaLabel: string;
};

export const DEFAULT_WORKSPACE_APP_ID: WorkspaceAppId = "todo";

export const WORKSPACE_APPS: WorkspaceAppDefinition[] = [
  {
    id: "todo",
    label: "Todos",
    ariaLabel: "Open todos app",
  },
  {
    id: "nicole",
    label: "Nicole",
    ariaLabel: "Open Nicole app",
  },
];

export function normalizeWorkspaceAppId(value?: string): WorkspaceAppId {
  return value === "nicole" ? "nicole" : DEFAULT_WORKSPACE_APP_ID;
}
