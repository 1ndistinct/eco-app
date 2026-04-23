import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { AppButton, AppIconButton } from "../../components/ui";
import { formatWorkspaceLabel } from "./workspaceLabels";

type WorkspaceSettingsViewProps = {
  open: boolean;
  currentWorkspace?: WorkspaceAccess;
  canManageCurrentWorkspace: boolean;
  deletingWorkspaceId: string | null;
  onClose: () => void;
  onDeleteWorkspace: () => void;
};

export function WorkspaceSettingsView({
  open,
  currentWorkspace,
  canManageCurrentWorkspace,
  deletingWorkspaceId,
  onClose,
  onDeleteWorkspace,
}: WorkspaceSettingsViewProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="workspace-settings-title"
    >
      <DialogTitle
        id="workspace-settings-title"
        sx={{ pb: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="h5" component="span">
            Workspace settings
          </Typography>
          {currentWorkspace ? (
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {formatWorkspaceLabel(currentWorkspace)}
            </Typography>
          ) : null}
        </Box>

        <AppIconButton aria-label="Close workspace settings" onClick={onClose}>
          <CloseRoundedIcon />
        </AppIconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 3 }}>
        {currentWorkspace ? (
          <Stack spacing={3}>
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
                  <AppButton
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
                  </AppButton>
                ) : (
                  <Typography color="text.secondary">
                    Only the owner can delete this workspace.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Stack>
        ) : (
          <Typography color="text.secondary">Select a workspace to view settings.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
