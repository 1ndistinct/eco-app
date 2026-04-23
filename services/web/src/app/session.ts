import { SessionState, WorkspaceAccess } from "./types";

export function normalizeWorkspaceAccess(
  workspace: Partial<WorkspaceAccess>,
): WorkspaceAccess | null {
  if (typeof workspace.id !== "string" || workspace.id.trim() === "") {
    return null;
  }
  if (typeof workspace.ownerEmail !== "string" || workspace.ownerEmail.trim() === "") {
    return null;
  }

  return {
    id: workspace.id,
    name:
      typeof workspace.name === "string" && workspace.name.trim() !== ""
        ? workspace.name
        : "Untitled workspace",
    description: typeof workspace.description === "string" ? workspace.description : "",
    ownerEmail: workspace.ownerEmail,
    role: workspace.role === "collaborator" ? "collaborator" : "owner",
  };
}

export function normalizeSessionState(data: Partial<SessionState>): SessionState {
  return {
    authenticated: data.authenticated === true,
    googleLoginEnabled: data.googleLoginEnabled === true,
    googleLoginURL: data.googleLoginURL ?? "",
    user: data.user,
    accessibleWorkspaces: Array.isArray(data.accessibleWorkspaces)
      ? data.accessibleWorkspaces
          .map((workspace) => normalizeWorkspaceAccess(workspace))
          .filter((workspace): workspace is WorkspaceAccess => workspace !== null)
      : [],
  };
}

export function authErrorMessage(code: string) {
  switch (code) {
    case "google_login_unavailable":
      return "Google login is not configured for this deployment.";
    case "google_login_cancelled":
      return "Google login was cancelled before it completed.";
    case "google_login_expired":
      return "Google login expired. Start the sign-in flow again.";
    case "google_email_not_verified":
      return "Google login requires a verified email address.";
    case "google_email_not_supported":
      return "Google login is limited to existing users with a Gmail address.";
    case "google_account_not_allowed":
      return "That Google account does not match an existing user in this app.";
    case "google_login_failed":
      return "Google login failed. Try again.";
    default:
      return "Unable to complete Google login.";
  }
}
