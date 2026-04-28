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
import { alpha } from "@mui/material/styles";

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
      aria-label="Settings"
      aria-labelledby="workspace-settings-heading"
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "#fcfdff",
            borderColor: alpha("#dbe4ed", 0.96),
            boxShadow: "0 24px 64px rgba(27, 39, 51, 0.16)",
            backdropFilter: "none",
          },
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{ pb: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <Box>
          <Typography id="workspace-settings-heading" variant="h5" component="h2">
            Settings
          </Typography>
          {currentWorkspace ? (
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {formatWorkspaceLabel(currentWorkspace)}
            </Typography>
          ) : null}
        </Box>

        <AppIconButton aria-label="Close settings" onClick={onClose}>
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

            <Paper
              elevation={0}
              sx={(theme) => ({
                p: "1rem 1.125rem",
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.error.main, 0.22)}`,
                backgroundColor: alpha(theme.palette.error.light, 0.08),
                boxShadow: "none",
              })}
            >
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
                    sx={(theme) => ({
                      alignSelf: "flex-start",
                      borderRadius: "var(--control-radius)",
                      backgroundColor: theme.palette.error.main,
                      borderColor: theme.palette.error.main,
                      color: theme.palette.error.contrastText,
                      "&:hover": {
                        backgroundColor: theme.palette.error.dark,
                        borderColor: theme.palette.error.dark,
                      },
                    })}
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
