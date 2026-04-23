import { FormEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { AppButton, PopoverSurface } from "../../components/ui";

type CollaboratorsPopoverProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  currentWorkspace?: WorkspaceAccess;
  currentUserEmail?: string;
  collaboratorEmails: string[];
  shareEmail: string;
  isSubmittingShare: boolean;
  shareError: string | null;
  shareSuccess: string | null;
  removingCollaboratorEmails: string[];
  onClose: () => void;
  onShareEmailChange: (value: string) => void;
  onShareWorkspace: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveCollaborator: (email: string) => void;
};

export function CollaboratorsPopover({
  anchorEl,
  open,
  currentWorkspace,
  currentUserEmail,
  collaboratorEmails,
  shareEmail,
  isSubmittingShare,
  shareError,
  shareSuccess,
  removingCollaboratorEmails,
  onClose,
  onShareEmailChange,
  onShareWorkspace,
  onRemoveCollaborator,
}: CollaboratorsPopoverProps) {
  if (!currentWorkspace) {
    return null;
  }

  return (
    <PopoverSurface
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Collaborators</Typography>
          <Typography color="text.secondary">
            {currentWorkspace.name} · {currentWorkspace.ownerEmail}
          </Typography>
        </Box>

        <Stack spacing={1.25}>
          <Paper elevation={0} className="collaborator-row">
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                <PersonRoundedIcon fontSize="small" />
                <Typography sx={{ minWidth: 0, wordBreak: "break-word" }}>
                  {currentWorkspace.ownerEmail}
                </Typography>
              </Stack>
              <Chip
                size="small"
                label="Owner"
                sx={{ color: "text.primary" }}
              />
            </Stack>
          </Paper>

          {collaboratorEmails.length === 0 ? (
            <Paper elevation={0} className="empty-state">
              <Typography color="text.secondary">No collaborators yet.</Typography>
            </Paper>
          ) : (
            collaboratorEmails.map((email) => {
              const isRemoving = removingCollaboratorEmails.includes(email);

              return (
                <Paper key={email} elevation={0} className="collaborator-row">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: "center" }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                      <GroupRoundedIcon fontSize="small" />
                      <Typography sx={{ minWidth: 0, wordBreak: "break-word" }}>
                        {email}
                        {email === currentUserEmail ? " · you" : ""}
                      </Typography>
                    </Stack>

                    <AppButton
                      variant="text"
                      color="error"
                      disabled={isRemoving || isSubmittingShare}
                      onClick={() => onRemoveCollaborator(email)}
                      aria-label={`Remove ${email}`}
                      startIcon={
                        isRemoving ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <DeleteOutlineRoundedIcon />
                        )
                      }
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </AppButton>
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>

        <Divider />

        <Box component="form" onSubmit={onShareWorkspace}>
          <Stack spacing={1.5}>
            <TextField
              label="Collaborator email"
              type="email"
              value={shareEmail}
              onChange={(event) => onShareEmailChange(event.target.value)}
              autoComplete="email"
              disabled={isSubmittingShare}
              size="small"
              fullWidth
            />
            <AppButton
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmittingShare}
              startIcon={
                isSubmittingShare ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AddRoundedIcon />
                )
              }
              sx={{ alignSelf: "flex-start" }}
            >
              {isSubmittingShare ? "Adding..." : "Add collaborator"}
            </AppButton>
          </Stack>
        </Box>

        {shareError ? <Alert severity="error">{shareError}</Alert> : null}
        {shareSuccess ? <Alert severity="success">{shareSuccess}</Alert> : null}
      </Stack>
    </PopoverSurface>
  );
}
