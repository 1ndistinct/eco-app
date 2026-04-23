import { FormEvent, MouseEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Badge,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { AppIconButton } from "../../components/ui";
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
  isWorkspaceSettingsOpen: boolean;
  isSidebarExpanded: boolean;
  onWorkspaceChange: (workspaceID: string) => void;
  onOpenCreateWorkspace: (event: MouseEvent<HTMLElement>) => void;
  onOpenCollaborators: (event: MouseEvent<HTMLElement>) => void;
  onCloseCollaborators: () => void;
  onShareEmailChange: (value: string) => void;
  onShareWorkspace: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveCollaborator: (email: string) => void;
  onToggleSidebar: () => void;
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
  isWorkspaceSettingsOpen,
  isSidebarExpanded,
  onWorkspaceChange,
  onOpenCreateWorkspace,
  onOpenCollaborators,
  onCloseCollaborators,
  onShareEmailChange,
  onShareWorkspace,
  onRemoveCollaborator,
  onToggleSidebar,
  onToggleSettings,
  onLogout,
}: WorkspaceHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (!isMobile) {
    return null;
  }

  function handleWorkspaceSelection(event: SelectChangeEvent<string>) {
    onWorkspaceChange(event.target.value);
  }

  const sidebarLabel = isSidebarExpanded ? "Close app drawer" : "Open app drawer";

  return (
    <Paper
      square
      elevation={0}
      className="page-header"
      sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 2 }, borderRadius: 0 }}
    >
      <Stack spacing={1.25} className="header-controls">
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            rowGap: 1,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            className="header-primary-controls"
            sx={{ alignItems: "center", flexWrap: "wrap", flex: "1 1 24rem" }}
          >
            {isMobile ? (
              <>
                <Stack direction="row" spacing={0.875} className="header-brand-cluster">
                  <Box component="img" src="/logo.svg" alt="Eco" className="header-logo" />
                  <Typography variant="h6" className="header-brand-wordmark">
                    eco
                  </Typography>
                </Stack>

                <Tooltip title={sidebarLabel}>
                  <AppIconButton
                    color="inherit"
                    className={`header-action-button header-sidebar-toggle${isSidebarExpanded ? " header-action-button-active" : ""}`}
                    aria-label={sidebarLabel}
                    onClick={onToggleSidebar}
                  >
                    {isSidebarExpanded ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
                  </AppIconButton>
                </Tooltip>
              </>
            ) : null}

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

            <Tooltip title="Create workspace">
              <AppIconButton
                color="primary"
                className="header-action-button"
                aria-label="Create workspace"
                onClick={onOpenCreateWorkspace}
              >
                <AddRoundedIcon />
              </AppIconButton>
            </Tooltip>

            <Tooltip
              title={`${collaboratorCount} collaborator${collaboratorCount === 1 ? "" : "s"}`}
            >
              <AppIconButton
                color="inherit"
                className="header-action-button header-collaborators"
                aria-label="Open collaborators"
                disabled={!currentWorkspace}
                onClick={onOpenCollaborators}
              >
                <Badge badgeContent={collaboratorCount} color="secondary" showZero>
                  <GroupRoundedIcon />
                </Badge>
              </AppIconButton>
            </Tooltip>
          </Stack>

          <Stack
            direction="row"
            spacing={0.75}
            className="header-utility-controls"
            sx={{ alignItems: "center", marginLeft: "auto" }}
          >
            <Tooltip title={isWorkspaceSettingsOpen ? "Close settings" : "Open settings"}>
              <span>
                <AppIconButton
                  color="inherit"
                  className={`header-action-button${isWorkspaceSettingsOpen ? " header-action-button-active" : ""}`}
                  aria-label={isWorkspaceSettingsOpen ? "Close settings" : "Open settings"}
                  disabled={!currentWorkspace}
                  onClick={onToggleSettings}
                >
                  <SettingsRoundedIcon />
                </AppIconButton>
              </span>
            </Tooltip>

            <Tooltip title="Log out">
              <AppIconButton
                color="inherit"
                className="header-action-button"
                aria-label="Log out"
                onClick={onLogout}
              >
                <LogoutRoundedIcon />
              </AppIconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {currentUserEmail ? (
          <Typography variant="body2" color="text.secondary" className="header-user-meta">
            Signed in as {currentUserEmail}
          </Typography>
        ) : null}
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
