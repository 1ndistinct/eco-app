import { Box, Paper, Stack, Typography } from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { TodoFeatureHost } from "../todos/TodoFeatureHost";

type WorkspaceViewProps = {
  currentWorkspace?: WorkspaceAccess;
  currentUserEmail?: string;
};

export function WorkspaceView({
  currentWorkspace,
  currentUserEmail,
}: WorkspaceViewProps) {
  if (!currentWorkspace) {
    return (
      <Paper
        elevation={0}
        className="soft-panel workspace-panel"
        sx={{
          p: { xs: 3, md: 3.5 },
          borderRadius: { xs: "var(--surface-radius)", md: "var(--surface-radius-lg)" },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="h5">No workspace selected</Typography>
          <Typography color="text.secondary">
            Choose a workspace from the picker or create a new one.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box className="workspace-layout">
      <Stack spacing={2.5} className="workspace-main">
        <TodoFeatureHost
          workspaceId={currentWorkspace.id}
          workspaceName={currentWorkspace.name}
          currentUserEmail={currentUserEmail}
        />
      </Stack>
    </Box>
  );
}
