import { FormEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Box, CircularProgress, Stack, TextField, Typography } from "@mui/material";

import { AppButton, PopoverSurface } from "../../components/ui";

type CreateWorkspacePopoverProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  workspaceName: string;
  workspaceDescription: string;
  isSubmittingWorkspace: boolean;
  createWorkspaceError: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

export function CreateWorkspacePopover({
  anchorEl,
  open,
  workspaceName,
  workspaceDescription,
  isSubmittingWorkspace,
  createWorkspaceError,
  onClose,
  onSubmit,
  onNameChange,
  onDescriptionChange,
}: CreateWorkspacePopoverProps) {
  return (
    <PopoverSurface
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      paperSx={{ width: { xs: "calc(100vw - 2rem)", sm: 420 } }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Create workspace</Typography>
          <Typography color="text.secondary">
            Add a separate workspace for a distinct set of todos and collaborators.
          </Typography>
        </Box>

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={1.5}>
            <TextField
              label="Workspace name"
              value={workspaceName}
              onChange={(event) => onNameChange(event.target.value)}
              disabled={isSubmittingWorkspace}
              size="small"
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={workspaceDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              disabled={isSubmittingWorkspace}
              multiline
              minRows={3}
              size="small"
              fullWidth
            />
            <AppButton
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmittingWorkspace}
              startIcon={
                isSubmittingWorkspace ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AddRoundedIcon />
                )
              }
              sx={{ alignSelf: "flex-start" }}
            >
              {isSubmittingWorkspace ? "Adding..." : "Add workspace"}
            </AppButton>
          </Stack>
        </Box>

        {createWorkspaceError ? <Alert severity="error">{createWorkspaceError}</Alert> : null}
      </Stack>
    </PopoverSurface>
  );
}
