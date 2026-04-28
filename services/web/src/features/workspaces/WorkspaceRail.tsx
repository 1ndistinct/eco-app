import { FormEvent, MouseEvent, ReactElement } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Badge,
  Box,
  Divider,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Paper,
} from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { AppButton, AppIconButton } from "../../components/ui";
import { CollaboratorsPopover } from "./CollaboratorsPopover";
import { formatWorkspaceLabel } from "./workspaceLabels";

type WorkspaceRailProps = {
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
  onOpenCreateWorkspace: (anchorEl: HTMLElement) => void;
  onOpenCollaborators: (event: MouseEvent<HTMLElement>) => void;
  onCloseCollaborators: () => void;
  onShareEmailChange: (value: string) => void;
  onShareWorkspace: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveCollaborator: (email: string) => void;
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
  onLogout: () => void;
};

export function WorkspaceRail({
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
}: WorkspaceRailProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (isMobile) {
    return null;
  }

  function handleWorkspaceSelection(event: SelectChangeEvent<string>) {
    onWorkspaceChange(event.target.value);
  }

  function renderAppButton(label: string, ariaLabel: string, icon: ReactElement) {
    if (isSidebarExpanded) {
      return (
        <AppButton
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={icon}
          aria-label={ariaLabel}
          className="workspace-sidebar-nav-button app-selector-item app-selector-item-active"
          sx={{ justifyContent: "flex-start" }}
        >
          {label}
        </AppButton>
      );
    }

    return (
      <Tooltip title={label} placement="right">
        <AppIconButton
          color="inherit"
          aria-label={ariaLabel}
          className="workspace-sidebar-icon-button workspace-sidebar-nav-icon app-selector-item app-selector-item-active"
        >
          {icon}
        </AppIconButton>
      </Tooltip>
    );
  }

  function renderUtilityButton(
    label: string,
    ariaLabel: string,
    icon: ReactElement,
    onClick: (() => void) | ((event: MouseEvent<HTMLElement>) => void),
    disabled = false,
    isActive = false,
  ) {
    if (isSidebarExpanded) {
      return (
        <AppButton
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={icon}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={onClick}
          className={`workspace-sidebar-section-button app-selector-item${isActive ? " app-selector-item-active" : ""}`}
          sx={{ justifyContent: "flex-start" }}
        >
          {label}
        </AppButton>
      );
    }

    return (
      <Tooltip title={label} placement="right">
        <span>
          <AppIconButton
            color="inherit"
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={onClick}
            className={`workspace-sidebar-icon-button app-selector-item${isActive ? " app-selector-item-active" : ""}`}
          >
            {icon}
          </AppIconButton>
        </span>
      </Tooltip>
    );
  }

  const selectorLabel = isSidebarExpanded
    ? "Collapse workspace selector"
    : "Open workspace selector";

  function handleOpenCreateWorkspace(event: MouseEvent<HTMLElement>) {
    onOpenCreateWorkspace(event.currentTarget);
  }

  return (
    <Paper
      square
      elevation={0}
      className={`workspace-sidebar${isSidebarExpanded ? " is-expanded" : ""}`}
    >
      <Stack spacing={2} className="workspace-sidebar-inner">
        {isSidebarExpanded ? (
          <Stack spacing={1} className="workspace-sidebar-namespace-stack">
            <FormControl size="small" fullWidth className="workspace-sidebar-namespace-select">
              <Select
                value={selectedWorkspace}
                onChange={handleWorkspaceSelection}
                displayEmpty
                aria-label="Workspace"
                renderValue={() => (
                  <Box className="workspace-sidebar-namespace-value">
                    <Box className="workspace-sidebar-logo-tile">
                      <Box component="img" src="/logo.svg" alt="Eco" className="workspace-sidebar-logo" />
                    </Box>

                    <Stack spacing={0.125} className="workspace-sidebar-namespace-copy">
                      <Typography variant="caption" color="text.secondary">
                        Workspace
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {currentWorkspace
                          ? formatWorkspaceLabel(currentWorkspace)
                          : "Select workspace"}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              >
                {accessibleWorkspaces.map((workspace) => (
                  <MenuItem key={workspace.id} value={workspace.id}>
                    {formatWorkspaceLabel(workspace)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <AppButton
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={<ChevronLeftRoundedIcon />}
              aria-label={selectorLabel}
              onClick={onToggleSidebar}
              className="workspace-sidebar-section-button app-selector-item"
              sx={{ justifyContent: "flex-start" }}
            >
              Collapse workspace selector
            </AppButton>
          </Stack>
        ) : (
          <Tooltip title={selectorLabel} placement="right">
            <AppIconButton
              color="inherit"
              aria-label={selectorLabel}
              onClick={onToggleSidebar}
              className="workspace-sidebar-icon-button app-selector-item"
            >
              <ChevronRightRoundedIcon />
            </AppIconButton>
          </Tooltip>
        )}

        <Divider className="workspace-sidebar-divider" />

        <Stack spacing={1} className="workspace-sidebar-primary">
          {renderUtilityButton(
            "Create workspace",
            "Create workspace",
            <AddRoundedIcon />,
            handleOpenCreateWorkspace,
          )}

          {renderUtilityButton(
            isSidebarExpanded
              ? `${collaboratorCount} collaborator${collaboratorCount === 1 ? "" : "s"}`
              : "Open collaborators",
            "Open collaborators",
            <Badge badgeContent={collaboratorCount} color="secondary" showZero>
              <GroupRoundedIcon />
            </Badge>,
            onOpenCollaborators,
            !currentWorkspace,
          )}
        </Stack>

        <Divider className="workspace-sidebar-divider" />

        <Stack spacing={1} className="workspace-sidebar-nav">
          {renderAppButton("Todos", "Open todos app", <ChecklistRoundedIcon />)}
        </Stack>

        <Box sx={{ flex: 1 }} />

        {isSidebarExpanded && currentUserEmail ? (
          <Stack spacing={0.25} className="workspace-sidebar-meta">
            <Typography variant="caption" color="text.secondary">
              Signed in as
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
              {currentUserEmail}
            </Typography>
          </Stack>
        ) : null}

        <Divider className="workspace-sidebar-divider" />

        <Stack spacing={1} className="workspace-sidebar-footer">
          {renderUtilityButton(
            "Settings",
            isWorkspaceSettingsOpen ? "Close settings" : "Open settings",
            <SettingsRoundedIcon />,
            onToggleSettings,
            !currentWorkspace,
            isWorkspaceSettingsOpen,
          )}

          {renderUtilityButton("Log out", "Log out", <LogoutRoundedIcon />, onLogout)}
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
