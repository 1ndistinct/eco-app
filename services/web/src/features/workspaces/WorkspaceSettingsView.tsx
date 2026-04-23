import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Button, CircularProgress, Paper, Stack, Typography, Box } from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { formatWorkspaceLabel } from "./workspaceLabels";

type WorkspaceSettingsViewProps = {
  currentWorkspace?: WorkspaceAccess;
  canManageCurrentWorkspace: boolean;
  deletingWorkspaceId: string | null;
  onBack: () => void;
  onDeleteWorkspace: () => void;
};

export function WorkspaceSettingsView({
  currentWorkspace,
  canManageCurrentWorkspace,
  deletingWorkspaceId,
  onBack,
  onDeleteWorkspace,
}: WorkspaceSettingsViewProps) {
  if (!currentWorkspace) {
    return (
      <Paper
        elevation={0}
        className="soft-panel workspace-panel"
        sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
      >
        <Typography color="text.secondary">Select a workspace to view settings.</Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      className="soft-panel workspace-panel"
      sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
    >
      <Stack spacing={3}>
        <Button
          variant="text"
          color="inherit"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={onBack}
          sx={{ alignSelf: "flex-start" }}
        >
          Back
        </Button>

        <Box>
          <Typography variant="h5">Workspace settings</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {formatWorkspaceLabel(currentWorkspace)}
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Name
            </Typography>
            <Typography>{currentWorkspace.name}</Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Description
            </Typography>
            <Typography>{currentWorkspace.description || "No description."}</Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Owner
            </Typography>
            <Typography>{currentWorkspace.ownerEmail}</Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Access
            </Typography>
            <Typography>{currentWorkspace.role}</Typography>
          </Box>
        </Stack>

        <Paper elevation={0} className="danger-panel">
          <Stack spacing={1.5}>
            <Typography variant="h6">Delete workspace</Typography>
            <Typography color="text.secondary">
              This removes the workspace, its collaborators, and all todos inside it.
            </Typography>
            {canManageCurrentWorkspace ? (
              <Button
                variant="contained"
                color="error"
                disabled={deletingWorkspaceId === currentWorkspace.id}
                onClick={onDeleteWorkspace}
                startIcon={
                  deletingWorkspaceId === currentWorkspace.id ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <DeleteOutlineRoundedIcon />
                  )
                }
                sx={{ alignSelf: "flex-start" }}
              >
                {deletingWorkspaceId === currentWorkspace.id
                  ? "Deleting..."
                  : "Delete workspace"}
              </Button>
            ) : (
              <Typography color="text.secondary">
                Only the owner can delete this workspace.
              </Typography>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Paper>
  );
}
