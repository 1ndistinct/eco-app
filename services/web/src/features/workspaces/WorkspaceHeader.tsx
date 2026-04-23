import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
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
  Typography,
} from "@mui/material";

import { WorkspaceAccess } from "../../app/types";
import { formatWorkspaceLabel } from "./workspaceLabels";

type WorkspaceHeaderProps = {
  currentUserEmail?: string;
  accessibleWorkspaces: WorkspaceAccess[];
  selectedWorkspace: string;
  currentWorkspace?: WorkspaceAccess;
  viewMode: "workspace" | "settings";
  onWorkspaceChange: (workspaceID: string) => void;
  onOpenCreateWorkspace: () => void;
  onToggleSettings: () => void;
  onLogout: () => void;
};

export function WorkspaceHeader({
  currentUserEmail,
  accessibleWorkspaces,
  selectedWorkspace,
  currentWorkspace,
  viewMode,
  onWorkspaceChange,
  onOpenCreateWorkspace,
  onToggleSettings,
  onLogout,
}: WorkspaceHeaderProps) {
  function handleWorkspaceSelection(event: SelectChangeEvent<string>) {
    onWorkspaceChange(event.target.value);
  }

  return (
    <Paper
      elevation={0}
      className="page-header"
      sx={{ p: { xs: 2, md: 2.5 }, borderRadius: { xs: "18px", md: "22px" } }}
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
    </Paper>
  );
}
