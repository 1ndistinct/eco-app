import { Stack, Typography } from "@mui/material";

import TodoFeature from "./exposed/TodoFeature";

function readPreviewContext() {
  if (typeof window === "undefined") {
    return {
      workspaceId: "",
      workspaceName: "",
      currentUserEmail: "",
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    workspaceId: params.get("workspace") ?? "",
    workspaceName: params.get("workspaceName") ?? "Preview workspace",
    currentUserEmail: params.get("user") ?? "",
  };
}

export function StandaloneApp() {
  const { workspaceId, workspaceName, currentUserEmail } = readPreviewContext();

  if (!workspaceId) {
    return (
      <Stack spacing={1.5} sx={{ maxWidth: 560, mx: "auto", p: { xs: 3, md: 4 } }}>
        <Typography variant="h4">Todo remote</Typography>
        <Typography color="text.secondary">
          Load this remote through the shell, or provide a workspace preview with
          `?workspace=workspace-1&workspaceName=Preview`.
        </Typography>
      </Stack>
    );
  }

  return (
    <TodoFeature
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      currentUserEmail={currentUserEmail}
    />
  );
}
