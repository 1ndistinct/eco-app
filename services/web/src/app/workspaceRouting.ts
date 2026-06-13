import { DEFAULT_WORKSPACE_APP_ID, normalizeWorkspaceAppId, WorkspaceAppId } from "./workspaceApps";

const WORKSPACE_PATH_SEGMENT = "workspaces";

export type WorkspaceLocation = {
  appId: WorkspaceAppId;
  workspaceId: string;
};

export function buildWorkspacePath(
  workspaceId: string,
  appId: WorkspaceAppId = DEFAULT_WORKSPACE_APP_ID,
) {
  return workspaceId ? `/${appId}/${WORKSPACE_PATH_SEGMENT}/${encodeURIComponent(workspaceId)}` : "/";
}

export function readWorkspaceLocationFromPath(pathname: string): WorkspaceLocation {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === WORKSPACE_PATH_SEGMENT) {
    if (segments.length !== 2) {
      return {
        appId: DEFAULT_WORKSPACE_APP_ID,
        workspaceId: "",
      };
    }

    try {
      return {
        appId: DEFAULT_WORKSPACE_APP_ID,
        workspaceId: decodeURIComponent(segments[1]),
      };
    } catch {
      return {
        appId: DEFAULT_WORKSPACE_APP_ID,
        workspaceId: "",
      };
    }
  }

  if (segments[1] === WORKSPACE_PATH_SEGMENT) {
    if (segments.length !== 3) {
      return {
        appId: DEFAULT_WORKSPACE_APP_ID,
        workspaceId: "",
      };
    }

    try {
      return {
        appId: normalizeWorkspaceAppId(segments[0]),
        workspaceId: decodeURIComponent(segments[2]),
      };
    } catch {
      return {
        appId: DEFAULT_WORKSPACE_APP_ID,
        workspaceId: "",
      };
    }
  }

  return {
    appId: DEFAULT_WORKSPACE_APP_ID,
    workspaceId: "",
  };
}

export function readWorkspaceIdFromPath(pathname: string) {
  return readWorkspaceLocationFromPath(pathname).workspaceId;
}
