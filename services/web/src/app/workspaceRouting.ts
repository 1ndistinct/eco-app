const WORKSPACE_PATH_SEGMENT = "workspaces";

export function buildWorkspacePath(workspaceId: string) {
  return workspaceId ? `/${WORKSPACE_PATH_SEGMENT}/${encodeURIComponent(workspaceId)}` : "/";
}

export function readWorkspaceIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== WORKSPACE_PATH_SEGMENT || segments.length !== 2) {
    return "";
  }

  try {
    return decodeURIComponent(segments[1]);
  } catch {
    return "";
  }
}
