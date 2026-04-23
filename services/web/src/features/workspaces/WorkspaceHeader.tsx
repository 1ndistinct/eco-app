import { FormEvent, MouseEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Badge,
  Box,
  Drawer,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { AppButton, AppIconButton } from "../../components/ui";
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
  onCloseSidebar: () => void;
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
  onCloseSidebar,
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

  function handleWorkspaceSelection(workspaceId: string) {
    onWorkspaceChange(workspaceId);
    onCloseSidebar();
  }

  function handleOpenSettings() {
    onCloseSidebar();
    onToggleSettings();
  }

  function handleLogout() {
    onCloseSidebar();
    onLogout();
  }

  const sidebarLabel = isSidebarExpanded ? "Close workspace menu" : "Open workspace menu";
  const currentWorkspaceLabel = currentWorkspace
    ? formatWorkspaceLabel(currentWorkspace)
    : "Select workspace";
  const currentWorkspaceMeta =
    currentWorkspace?.description || currentUserEmail || "Choose a workspace";

  return (
    <Paper
      square
      elevation={0}
      className="page-header workspace-mobile-topbar"
      sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 2 }, borderRadius: 0 }}
    >
      <Stack spacing={1} className="header-controls">
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Stack direction="row" spacing={1} className="workspace-mobile-topbar-main">
            <Tooltip title={sidebarLabel}>
              <AppIconButton
                color="inherit"
                className={`header-action-button header-sidebar-toggle${isSidebarExpanded ? " header-action-button-active" : ""}`}
                aria-label={sidebarLabel}
                onClick={isSidebarExpanded ? onCloseSidebar : onToggleSidebar}
              >
                {isSidebarExpanded ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
              </AppIconButton>
            </Tooltip>

            <Stack spacing={0.125} className="workspace-mobile-topbar-copy">
              <Typography variant="overline" className="workspace-mobile-topbar-kicker">
                Workspace
              </Typography>
              <Typography variant="h6" className="workspace-mobile-topbar-title">
                {currentWorkspace?.name ?? "No workspace selected"}
              </Typography>
            </Stack>
          </Stack>

          <Stack
            direction="row"
            spacing={0.75}
            className="header-utility-controls"
            sx={{ alignItems: "center" }}
          >
            <Tooltip
              title={`${collaboratorCount} collaborator${collaboratorCount === 1 ? "" : "s"}`}
            >
              <span>
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
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" className="workspace-mobile-topbar-meta">
          {currentWorkspaceMeta}
        </Typography>
      </Stack>

      <Drawer
        anchor="left"
        open={isSidebarExpanded}
        onClose={onCloseSidebar}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { className: "workspace-mobile-drawer" } }}
      >
        <Box className="workspace-mobile-drawer-shell">
          <Box className="workspace-mobile-drawer-header">
            <Stack spacing={0.375}>
              <Typography variant="overline" className="workspace-mobile-topbar-kicker">
                Eco
              </Typography>
              <Typography variant="h5">Workspace menu</Typography>
            </Stack>

            <AppIconButton
              color="inherit"
              aria-label="Close workspace menu"
              className="sidebar-toggle-button"
              onClick={onCloseSidebar}
            >
              <CloseRoundedIcon />
            </AppIconButton>
          </Box>

          <Paper elevation={0} className="workspace-mobile-current-card">
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
              <Box className="workspace-sidebar-logo-tile">
                <Box component="img" src="/logo.svg" alt="Eco" className="workspace-sidebar-logo" />
              </Box>

              <Stack spacing={0.25} className="workspace-mobile-current-copy">
                <Typography variant="subtitle1" className="workspace-mobile-topbar-title">
                  {currentWorkspaceLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentUserEmail
                    ? `Signed in as ${currentUserEmail}`
                    : "Pick a workspace to continue."}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Stack spacing={0.75} className="workspace-mobile-section">
            <Typography variant="overline" className="workspace-mobile-section-label">
              Workspaces
            </Typography>
            <Stack spacing={0.75} className="workspace-mobile-workspace-list">
              {accessibleWorkspaces.map((workspace) => {
                const isActive = workspace.id === selectedWorkspace;

                return (
                  <AppButton
                    key={workspace.id}
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    className={`workspace-mobile-workspace-button app-selector-item${isActive ? " app-selector-item-active" : ""}`}
                    onClick={() => handleWorkspaceSelection(workspace.id)}
                    sx={{
                      justifyContent: "flex-start",
                      px: 1.25,
                      py: 1.125,
                      textTransform: "none",
                    }}
                  >
                    <Stack spacing={0.25} className="workspace-mobile-workspace-copy">
                      <Typography variant="body2" className="workspace-mobile-workspace-name">
                        {workspace.name}
                      </Typography>
                      <Typography variant="caption" className="workspace-mobile-workspace-meta">
                        {workspace.description || workspace.ownerEmail}
                      </Typography>
                    </Stack>
                  </AppButton>
                );
              })}
            </Stack>
          </Stack>

          <Stack spacing={0.75} className="workspace-mobile-section">
            <Typography variant="overline" className="workspace-mobile-section-label">
              Apps
            </Typography>
            <Stack spacing={0.75} className="app-selector">
              <AppButton
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<ChecklistRoundedIcon />}
                className="workspace-mobile-workspace-button app-selector-item app-selector-item-active"
                onClick={onCloseSidebar}
                sx={{ justifyContent: "flex-start", px: 1.25, py: 1.125, textTransform: "none" }}
              >
                Todos
              </AppButton>
            </Stack>
          </Stack>

          <Stack spacing={0.75} className="workspace-mobile-section">
            <Typography variant="overline" className="workspace-mobile-section-label">
              Actions
            </Typography>
            <Stack spacing={0.75} className="app-selector">
              <AppButton
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<AddRoundedIcon />}
                className="workspace-mobile-workspace-button app-selector-item"
                onClick={onOpenCreateWorkspace}
                sx={{ justifyContent: "flex-start", px: 1.25, py: 1.125, textTransform: "none" }}
              >
                Create workspace
              </AppButton>

              <AppButton
                fullWidth
                variant="outlined"
                color="inherit"
                startIcon={<SettingsRoundedIcon />}
                className={`workspace-mobile-workspace-button app-selector-item${isWorkspaceSettingsOpen ? " app-selector-item-active" : ""}`}
                disabled={!currentWorkspace}
                onClick={handleOpenSettings}
                sx={{ justifyContent: "flex-start", px: 1.25, py: 1.125, textTransform: "none" }}
              >
                {isWorkspaceSettingsOpen ? "Close settings" : "Open settings"}
              </AppButton>
            </Stack>
          </Stack>

          <Box className="workspace-mobile-drawer-footer">
            <Typography
              variant="body2"
              color="text.secondary"
              className="workspace-mobile-drawer-footer-copy"
            >
              {currentWorkspace?.description || "Track your work without leaving the list view."}
            </Typography>
            <AppButton
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={<LogoutRoundedIcon />}
              className="workspace-mobile-workspace-button app-selector-item"
              onClick={handleLogout}
              sx={{
                justifyContent: "flex-start",
                px: 1.25,
                py: 1.125,
                textTransform: "none",
                mt: 1,
              }}
            >
              Log out
            </AppButton>
          </Box>
        </Box>
      </Drawer>

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
