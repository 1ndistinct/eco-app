import { FormEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { alpha } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { Todo, WorkspaceAccess } from "../../app/types";
import { TodosPanel } from "../todos/TodosPanel";

type WorkspaceViewProps = {
  currentWorkspace?: WorkspaceAccess;
  currentUserEmail?: string;
  collaboratorEmails: string[];
  shareEmail: string;
  isSubmittingShare: boolean;
  shareError: string | null;
  shareSuccess: string | null;
  onShareEmailChange: (value: string) => void;
  onShareWorkspace: (event: FormEvent<HTMLFormElement>) => void;
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
  collaboratorEmails,
  shareEmail,
  isSubmittingShare,
  shareError,
  shareSuccess,
  onShareEmailChange,
  onShareWorkspace,
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
    <Stack spacing={2.5}>
      <Paper
        elevation={0}
        className="soft-panel workspace-panel"
        sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ justifyContent: "space-between", alignItems: { md: "flex-start" } }}
          >
            <Box>
              <Typography variant="h4">{currentWorkspace.name}</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                {currentWorkspace.description || "No description."}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip
                icon={<PersonRoundedIcon />}
                label={`Owner: ${currentWorkspace.ownerEmail}`}
              />
              <Chip
                icon={<GroupRoundedIcon />}
                label={`${collaboratorEmails.length + 1} member${collaboratorEmails.length + 1 === 1 ? "" : "s"}`}
              />
            </Stack>
          </Stack>

          <Box className="subapp-shell">
            <Typography variant="overline" color="text.secondary">
              Workspace app
            </Typography>
            <Box className="subapp-nav">
              <Button variant="contained" color="primary" disableElevation>
                Todos
              </Button>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        className="soft-panel workspace-panel"
        sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">Collaborators</Typography>
            <Typography color="text.secondary">
              Everyone listed here can work inside this workspace.
            </Typography>
          </Box>

          <Box className="chip-list">
            <Chip
              icon={<PersonRoundedIcon />}
              label={`${currentWorkspace.ownerEmail} · owner`}
              sx={{
                bgcolor: alpha("#16423c", 0.08),
                color: "text.primary",
              }}
            />
            {collaboratorEmails.map((email) => (
              <Chip
                key={email}
                icon={<GroupRoundedIcon />}
                label={email}
                sx={{
                  bgcolor: alpha("#f05d3f", 0.08),
                  color: "text.primary",
                }}
              />
            ))}
          </Box>

          <Box component="form" onSubmit={onShareWorkspace} aria-label="Share workspace">
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              sx={{ alignItems: { md: "flex-start" } }}
            >
              <TextField
                label="Collaborator email"
                type="email"
                value={shareEmail}
                onChange={(event) => onShareEmailChange(event.target.value)}
                autoComplete="email"
                disabled={isSubmittingShare}
                fullWidth
              />
              <Button
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
                sx={{ minWidth: { md: 160 }, alignSelf: "flex-start" }}
              >
                {isSubmittingShare ? "Adding..." : "Add collaborator"}
              </Button>
            </Stack>
          </Box>

          {shareError ? <Alert severity="error">{shareError}</Alert> : null}
          {shareSuccess ? <Alert severity="success">{shareSuccess}</Alert> : null}
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
  );
}
