import { FormEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { alpha } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { Todo, WorkspaceAccess, WorkspaceApp, WorkspaceNote } from "../../app/types";
import { NotesPanel } from "../notes/NotesPanel";
import { TodosPanel } from "../todos/TodosPanel";

type WorkspaceViewProps = {
  currentWorkspace?: WorkspaceAccess;
  currentUserEmail?: string;
  activeWorkspaceApp: WorkspaceApp;
  isSidebarExpanded: boolean;
  collaboratorEmails: string[];
  shareEmail: string;
  isSubmittingShare: boolean;
  shareError: string | null;
  shareSuccess: string | null;
  onShareEmailChange: (value: string) => void;
  onShareWorkspace: (event: FormEvent<HTMLFormElement>) => void;
  onWorkspaceAppChange: (app: WorkspaceApp) => void;
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
  notes: WorkspaceNote[];
  noteError: string | null;
  isAddingNoteInline: boolean;
  draftNoteTitle: string;
  draftNoteContent: string;
  onStartInlineNote: () => void;
  onDraftNoteTitleChange: (value: string) => void;
  onDraftNoteContentChange: (value: string) => void;
  onSubmitNote: (event: FormEvent<HTMLFormElement>) => void;
  onCancelInlineNote: () => void;
};

export function WorkspaceView({
  currentWorkspace,
  currentUserEmail,
  activeWorkspaceApp,
  isSidebarExpanded,
  collaboratorEmails,
  shareEmail,
  isSubmittingShare,
  shareError,
  shareSuccess,
  onShareEmailChange,
  onShareWorkspace,
  onWorkspaceAppChange,
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
  notes,
  noteError,
  isAddingNoteInline,
  draftNoteTitle,
  draftNoteContent,
  onStartInlineNote,
  onDraftNoteTitleChange,
  onDraftNoteContentChange,
  onSubmitNote,
  onCancelInlineNote,
}: WorkspaceViewProps) {
  function renderAppButton(app: WorkspaceApp, label: string, icon: JSX.Element) {
    const isActive = activeWorkspaceApp === app;

    if (isSidebarExpanded) {
      return (
        <Button
          key={app}
          fullWidth
          variant={isActive ? "contained" : "text"}
          color={isActive ? "primary" : "inherit"}
          startIcon={icon}
          onClick={() => onWorkspaceAppChange(app)}
          sx={{ justifyContent: "flex-start" }}
        >
          {label}
        </Button>
      );
    }

    return (
      <Tooltip key={app} title={label} placement="right">
        <IconButton
          color={isActive ? "primary" : "default"}
          aria-label={`Open ${label.toLowerCase()} app`}
          onClick={() => onWorkspaceAppChange(app)}
          className={`app-selector-icon${isActive ? " app-selector-icon-active" : ""}`}
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
            {renderAppButton("todos", "Todos", <ChecklistRoundedIcon />)}
            {renderAppButton("notes", "Notes", <NotesRoundedIcon />)}
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

        {activeWorkspaceApp === "todos" ? (
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
        ) : (
          <NotesPanel
            currentWorkspace={currentWorkspace}
            notes={notes}
            noteError={noteError}
            isAddingNoteInline={isAddingNoteInline}
            draftNoteTitle={draftNoteTitle}
            draftNoteContent={draftNoteContent}
            onStartInlineNote={onStartInlineNote}
            onDraftNoteTitleChange={onDraftNoteTitleChange}
            onDraftNoteContentChange={onDraftNoteContentChange}
            onSubmitNote={onSubmitNote}
            onCancelInlineNote={onCancelInlineNote}
          />
        )}
      </Stack>
    </Box>
  );
}
