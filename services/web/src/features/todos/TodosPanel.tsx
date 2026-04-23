import { FormEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { Todo, WorkspaceAccess } from "../../app/types";
import { AppButton } from "../../components/ui";

type TodosPanelProps = {
  currentWorkspace?: WorkspaceAccess;
  currentUserEmail?: string;
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

export function TodosPanel({
  currentWorkspace,
  currentUserEmail,
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
}: TodosPanelProps) {
  return (
    <Paper
      elevation={0}
      className="soft-panel workspace-panel"
      sx={{
        p: { xs: 3, md: 3.5 },
        borderRadius: { xs: "var(--surface-radius)", md: "var(--surface-radius-lg)" },
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
        >
          <Box>
            <Typography variant="h6">Todos</Typography>
            <Typography color="text.secondary">
              {currentWorkspace
                ? `${remainingCount} open, ${completedCount} completed.`
                : "Select a workspace to use the todos app."}
            </Typography>
          </Box>
          <AppButton
            variant="outlined"
            color="inherit"
            startIcon={<AddRoundedIcon />}
            onClick={onStartInlineTodo}
            disabled={isAddingTodoInline || !currentWorkspace}
          >
            Add item
          </AppButton>
        </Stack>

        {todoError ? <Alert severity="error">{todoError}</Alert> : null}

        {isAddingTodoInline ? (
          <Paper elevation={0} className="todo-row todo-row-editor">
            <Box component="form" onSubmit={onSubmitTodo}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{ alignItems: { md: "flex-start" } }}
              >
                <TextField
                  label="New todo"
                  value={draftTodoTitle}
                  onChange={(event) => onDraftTodoTitleChange(event.target.value)}
                  autoFocus
                  disabled={isSubmittingTodo}
                  fullWidth
                />
                <Stack direction="row" spacing={1}>
                  <AppButton
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmittingTodo}
                    startIcon={
                      isSubmittingTodo ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <DoneRoundedIcon />
                      )
                    }
                  >
                    {isSubmittingTodo ? "Saving..." : "Save"}
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="text"
                    color="inherit"
                    disabled={isSubmittingTodo}
                    onClick={onCancelInlineTodo}
                  >
                    Cancel
                  </AppButton>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        ) : null}

        {isWorkspaceLoading ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography>Loading workspace...</Typography>
          </Stack>
        ) : null}

        {!isWorkspaceLoading && workspaceError ? <Alert severity="error">{workspaceError}</Alert> : null}

        {!isWorkspaceLoading && !workspaceError && todos.length === 0 && !isAddingTodoInline ? (
          <Paper elevation={0} className="empty-state">
            <Stack spacing={0.75}>
              <Typography variant="h6">No todos</Typography>
              <Typography color="text.secondary">
                Add an item to start using the todos app in this workspace.
              </Typography>
            </Stack>
          </Paper>
        ) : null}

        {!isWorkspaceLoading && !workspaceError && todos.length > 0 ? (
          <Box component="ul" className="todo-list" aria-label="Todo items">
            {todos.map((todo) => {
              const isUpdating = updatingTodoIds.includes(todo.id);
              const isDeleting = deletingTodoIds.includes(todo.id);
              const isMutating = isUpdating || isDeleting;
              const ownerLabel =
                todo.ownerEmail === currentUserEmail
                  ? "Owned by you"
                  : `Owned by ${todo.ownerEmail}`;
              const statusLabel = todo.completed ? "Completed" : "Open";

              return (
                <Paper
                  key={todo.id}
                  component="li"
                  elevation={0}
                  className={`todo-row${todo.completed ? " todo-row-done" : ""}`}
                  sx={{ opacity: isMutating ? 0.7 : 1 }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        className={todo.completed ? "todo-title-done" : undefined}
                      >
                        {todo.title}
                      </Typography>
                      <Typography color="text.secondary">
                        {ownerLabel} · {statusLabel}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} className="todo-actions">
                      <AppButton
                        variant={todo.completed ? "outlined" : "contained"}
                        color={todo.completed ? "inherit" : "success"}
                        disabled={isMutating}
                        onClick={() => onToggleTodo(todo)}
                      >
                        {isUpdating
                          ? "Saving..."
                          : todo.completed
                          ? "Reopen"
                          : "Mark done"}
                      </AppButton>
                      <AppButton
                        variant="text"
                        color="error"
                        disabled={isMutating}
                        onClick={() => onDeleteTodo(todo)}
                        aria-label={isDeleting ? `Deleting ${todo.title}` : `Delete ${todo.title}`}
                        startIcon={
                          isDeleting ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <DeleteOutlineRoundedIcon />
                          )
                        }
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AppButton>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}
