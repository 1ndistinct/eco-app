import { FormEvent } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

import { Todo, WorkspaceAccess } from "../../app/types";
import { TodosPanel } from "../todos/TodosPanel";

type WorkspaceViewProps = {
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

export function WorkspaceView({
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
}: WorkspaceViewProps) {
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
