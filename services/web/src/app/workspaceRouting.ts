const TODO_PATH_SEGMENT = "todo";
const WORKSPACE_PATH_SEGMENT = "workspaces";

export function buildWorkspacePath(workspaceId: string) {
  return workspaceId
    ? `/${TODO_PATH_SEGMENT}/${WORKSPACE_PATH_SEGMENT}/${encodeURIComponent(workspaceId)}`
    : "/";
}

export function readWorkspaceIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === TODO_PATH_SEGMENT && segments[1] === WORKSPACE_PATH_SEGMENT) {
    if (segments.length !== 3) {
      return "";
    }

    try {
      return decodeURIComponent(segments[2]);
    } catch {
      return "";
    }
  }

  if (segments[0] === WORKSPACE_PATH_SEGMENT && segments.length === 2) {
    try {
      return decodeURIComponent(segments[1]);
    } catch {
      return "";
    }
  }

  return "";
}
