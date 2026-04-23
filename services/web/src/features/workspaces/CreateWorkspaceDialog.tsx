import { FormEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";

type CreateWorkspaceDialogProps = {
  open: boolean;
  workspaceName: string;
  workspaceDescription: string;
  isSubmittingWorkspace: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

export function CreateWorkspaceDialog({
  open,
  workspaceName,
  workspaceDescription,
  isSubmittingWorkspace,
  onClose,
  onSubmit,
  onNameChange,
  onDescriptionChange,
}: CreateWorkspaceDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <Box component="form" onSubmit={onSubmit}>
        <DialogTitle>Create workspace</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Workspace name"
              value={workspaceName}
              onChange={(event) => onNameChange(event.target.value)}
              disabled={isSubmittingWorkspace}
              fullWidth
            />
            <TextField
              label="Description"
              value={workspaceDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              disabled={isSubmittingWorkspace}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmittingWorkspace}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmittingWorkspace}
            startIcon={
              isSubmittingWorkspace ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <AddRoundedIcon />
              )
            }
          >
            {isSubmittingWorkspace ? "Creating..." : "Create workspace"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
