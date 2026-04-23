import { FormEvent } from "react";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import { Todo, WorkspaceAccess } from "../../app/types";
import { TodosPanel } from "../todos/TodosPanel";

type WorkspaceViewProps = {
  currentWorkspace?: WorkspaceAccess;
  currentUserEmail?: string;
  isSidebarExpanded: boolean;
  onToggleSidebar: () => void;
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
  onToggleSidebar,
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
  function renderAppButton(label: string, icon: JSX.Element) {
    if (isSidebarExpanded) {
      return (
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={icon}
          sx={{ justifyContent: "flex-start" }}
        >
          {label}
        </Button>
      );
    }

    return (
      <Tooltip title={label} placement="right">
        <IconButton
          color="primary"
          aria-label={`Open ${label.toLowerCase()} app`}
          className="app-selector-icon app-selector-icon-active"
        >
          {icon}
        </IconButton>
      </Tooltip>
    );
  }

  if (!currentWorkspace) {
    return (
      <Paper
        elevation={0}
        className="soft-panel workspace-panel"
        sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
      >
        <Stack spacing={1}>
          <Typography variant="h5">No workspace selected</Typography>
          <Typography color="text.secondary">
            Choose a workspace in the header or create a new one.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box className="workspace-layout">
      <Paper
        elevation={0}
        className={`soft-panel workspace-panel workspace-sidebar${isSidebarExpanded ? " is-expanded" : ""}`}
        sx={{ p: { xs: 1.5, md: 2 }, borderRadius: { xs: "18px", md: "22px" } }}
      >
        <Stack spacing={2}>
          <Box className="workspace-sidebar-header">
            <Tooltip title={isSidebarExpanded ? "Collapse apps" : "Expand apps"}>
              <IconButton
                color="inherit"
                aria-label={isSidebarExpanded ? "Collapse app sidebar" : "Expand app sidebar"}
                onClick={onToggleSidebar}
              >
                <MenuOpenRoundedIcon />
              </IconButton>
            </Tooltip>
            {isSidebarExpanded ? (
              <Typography variant="overline" color="text.secondary">
                Apps
              </Typography>
            ) : null}
          </Box>

          <Stack spacing={1} className="app-selector">
            {renderAppButton("Todos", <ChecklistRoundedIcon />)}
          </Stack>
        </Stack>
      </Paper>

      <Stack spacing={2.5} className="workspace-main">
        <Paper
          elevation={0}
          className="soft-panel workspace-panel"
          sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h4">{currentWorkspace.name}</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                {currentWorkspace.description || "No description."}
              </Typography>
            </Box>
          </Stack>
        </Paper>

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
