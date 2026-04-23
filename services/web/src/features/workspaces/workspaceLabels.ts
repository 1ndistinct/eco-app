import { WorkspaceAccess } from "../../app/types";

export function formatWorkspaceLabel(workspace: WorkspaceAccess) {
  return `${workspace.name} · ${workspace.ownerEmail}`;
}
