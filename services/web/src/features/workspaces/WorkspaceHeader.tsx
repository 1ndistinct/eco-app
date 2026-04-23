import { FormEvent, MouseEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Badge,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { CollaboratorsPopover } from "./CollaboratorsPopover";
import { formatWorkspaceLabel } from "./workspaceLabels";

type WorkspaceHeaderProps = {
  currentUserEmail?: string;
  accessibleWorkspaces: WorkspaceAccess[];
  selectedWorkspace: string;
  currentWorkspace?: WorkspaceAccess;
  collaboratorCount: number;
  collaboratorMenuAnchorEl: HTMLElement | null;
  isCollaboratorMenuOpen: boolean;
  collaboratorEmails: string[];
  shareEmail: string;
  isSubmittingShare: boolean;
  shareError: string | null;
  shareSuccess: string | null;
  removingCollaboratorEmails: string[];
  viewMode: "workspace" | "settings";
  onWorkspaceChange: (workspaceID: string) => void;
  onOpenCreateWorkspace: () => void;
  onOpenCollaborators: (event: MouseEvent<HTMLElement>) => void;
  onCloseCollaborators: () => void;
  onShareEmailChange: (value: string) => void;
  onShareWorkspace: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveCollaborator: (email: string) => void;
  onToggleSettings: () => void;
  onLogout: () => void;
};

export function WorkspaceHeader({
  currentUserEmail,
  accessibleWorkspaces,
  selectedWorkspace,
  currentWorkspace,
  collaboratorCount,
  collaboratorMenuAnchorEl,
  isCollaboratorMenuOpen,
  collaboratorEmails,
  shareEmail,
  isSubmittingShare,
  shareError,
  shareSuccess,
  removingCollaboratorEmails,
  viewMode,
  onWorkspaceChange,
  onOpenCreateWorkspace,
  onOpenCollaborators,
  onCloseCollaborators,
  onShareEmailChange,
  onShareWorkspace,
  onRemoveCollaborator,
  onToggleSettings,
  onLogout,
}: WorkspaceHeaderProps) {
  function handleWorkspaceSelection(event: SelectChangeEvent<string>) {
    onWorkspaceChange(event.target.value);
  }

  return (
    <Paper
      square
      elevation={0}
      className="page-header"
      sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 2 }, borderRadius: 0 }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { lg: "center" } }}
      >
        <Box>
          <Typography variant="h5">Workspaces</Typography>
          <Typography color="text.secondary">{currentUserEmail}</Typography>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { sm: "center" }, width: { xs: "100%", lg: "auto" } }}
        >
          <Tooltip
            title={`${collaboratorCount} collaborator${collaboratorCount === 1 ? "" : "s"}`}
          >
            <IconButton
              color="inherit"
              className="header-collaborators"
              aria-label="Open collaborators"
              disabled={!currentWorkspace}
              onClick={onOpenCollaborators}
            >
              <Badge badgeContent={collaboratorCount} color="secondary" showZero>
                <GroupRoundedIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <FormControl size="small" className="workspace-select">
            <InputLabel id="workspace-select-label">Workspace</InputLabel>
            <Select
              labelId="workspace-select-label"
              value={selectedWorkspace}
              label="Workspace"
              onChange={handleWorkspaceSelection}
              displayEmpty
              renderValue={() =>
                currentWorkspace ? formatWorkspaceLabel(currentWorkspace) : "Select workspace"
              }
            >
              {accessibleWorkspaces.map((workspace) => (
                <MenuItem key={workspace.id} value={workspace.id}>
                  {formatWorkspaceLabel(workspace)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <IconButton
            color="primary"
            aria-label="Create workspace"
            onClick={onOpenCreateWorkspace}
          >
            <AddRoundedIcon />
          </IconButton>

          <Button
            variant={viewMode === "settings" ? "contained" : "outlined"}
            color="inherit"
            startIcon={<SettingsRoundedIcon />}
            disabled={!currentWorkspace}
            onClick={onToggleSettings}
          >
            {viewMode === "settings" ? "Back to workspace" : "Workspace settings"}
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            onClick={onLogout}
            startIcon={<LogoutRoundedIcon />}
          >
            Log out
          </Button>
        </Stack>
      </Stack>

      <CollaboratorsPopover
        anchorEl={collaboratorMenuAnchorEl}
        open={isCollaboratorMenuOpen}
        currentWorkspace={currentWorkspace}
        currentUserEmail={currentUserEmail}
        collaboratorEmails={collaboratorEmails}
        shareEmail={shareEmail}
        isSubmittingShare={isSubmittingShare}
        shareError={shareError}
        shareSuccess={shareSuccess}
        removingCollaboratorEmails={removingCollaboratorEmails}
        onClose={onCloseCollaborators}
        onShareEmailChange={onShareEmailChange}
        onShareWorkspace={onShareWorkspace}
        onRemoveCollaborator={onRemoveCollaborator}
      />
    </Paper>
  );
}
