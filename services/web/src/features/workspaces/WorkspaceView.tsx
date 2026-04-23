import { FormEvent, ReactElement } from "react";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Drawer,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import { Todo, WorkspaceAccess } from "../../app/types";
import { AppButton, AppIconButton } from "../../components/ui";
import { TodosPanel } from "../todos/TodosPanel";

type WorkspaceViewProps = {
  currentWorkspace?: WorkspaceAccess;
  currentUserEmail?: string;
  isSidebarExpanded: boolean;
  onCloseSidebar: () => void;
  todos: Todo[];
  remainingCount: number;
  completedCount: number;
  isWorkspaceLoading: boolean;
  workspaceError: string | null;
  todoError: string | null;
  isAddingTodoInline: boolean;
  draftTodoTitle: string;
  isSubmittingTodo: boolean;
  updatingTodoIds: string[];
  deletingTodoIds: string[];
  onStartInlineTodo: () => void;
  onDraftTodoTitleChange: (value: string) => void;
  onSubmitTodo: (event: FormEvent<HTMLFormElement>) => void;
  onCancelInlineTodo: () => void;
  onToggleTodo: (todo: Todo) => void;
  onDeleteTodo: (todo: Todo) => void;
};

export function WorkspaceView({
  currentWorkspace,
  currentUserEmail,
  isSidebarExpanded,
  onCloseSidebar,
  todos,
  remainingCount,
  completedCount,
  isWorkspaceLoading,
  workspaceError,
  todoError,
  isAddingTodoInline,
  draftTodoTitle,
  isSubmittingTodo,
  updatingTodoIds,
  deletingTodoIds,
  onStartInlineTodo,
  onDraftTodoTitleChange,
  onSubmitTodo,
  onCancelInlineTodo,
  onToggleTodo,
  onDeleteTodo,
}: WorkspaceViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  function renderMobileAppButton(label: string, icon: ReactElement) {
    return (
      <AppButton
        fullWidth
        variant="outlined"
        color="inherit"
        startIcon={icon}
        className="app-selector-button app-selector-item app-selector-item-active"
        onClick={onCloseSidebar}
        sx={{ justifyContent: "flex-start" }}
      >
        {label}
      </AppButton>
    );
  }

  if (!currentWorkspace) {
    return (
      <Paper
        elevation={0}
        className="soft-panel workspace-panel"
        sx={{
          p: { xs: 3, md: 3.5 },
          borderRadius: { xs: "var(--surface-radius)", md: "var(--surface-radius-lg)" },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="h5">No workspace selected</Typography>
          <Typography color="text.secondary">
            Choose a workspace from the picker or create a new one.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box className="workspace-layout">
      {isMobile ? (
        <Drawer
          anchor="top"
          open={isSidebarExpanded}
          onClose={onCloseSidebar}
          ModalProps={{ keepMounted: true }}
          slotProps={{ paper: { className: "workspace-mobile-drawer" } }}
        >
          <Box className="workspace-mobile-drawer-shell">
            <Box className="workspace-mobile-drawer-header">
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Apps
                </Typography>
                <Typography variant="h5">Choose a section</Typography>
              </Box>

              <AppIconButton
                color="inherit"
                aria-label="Close app drawer"
                className="sidebar-toggle-button"
                onClick={onCloseSidebar}
              >
                <CloseRoundedIcon />
              </AppIconButton>
            </Box>

            <Stack spacing={1.25} className="app-selector">
              {renderMobileAppButton("Todos", <ChecklistRoundedIcon />)}
            </Stack>
          </Box>
        </Drawer>
      ) : null}

      <Stack spacing={2.5} className="workspace-main">
        <TodosPanel
          currentWorkspace={currentWorkspace}
          currentUserEmail={currentUserEmail}
          todos={todos}
          remainingCount={remainingCount}
          completedCount={completedCount}
          isWorkspaceLoading={isWorkspaceLoading}
          workspaceError={workspaceError}
          todoError={todoError}
          isAddingTodoInline={isAddingTodoInline}
          draftTodoTitle={draftTodoTitle}
          isSubmittingTodo={isSubmittingTodo}
          updatingTodoIds={updatingTodoIds}
          deletingTodoIds={deletingTodoIds}
          onStartInlineTodo={onStartInlineTodo}
          onDraftTodoTitleChange={onDraftTodoTitleChange}
          onSubmitTodo={onSubmitTodo}
          onCancelInlineTodo={onCancelInlineTodo}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
        />
      </Stack>
    </Box>
  );
}
