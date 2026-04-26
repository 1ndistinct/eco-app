import { FormEvent, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { readErrorMessage, TODO_ENDPOINT } from "../app/api";
import { Todo, TodoFeatureProps, TodoListResponse } from "../app/types";

export default function TodoFeature({
  workspaceId,
  workspaceName,
  currentUserEmail,
}: TodoFeatureProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [draftTodoTitle, setDraftTodoTitle] = useState("");
  const [isAddingTodoInline, setIsAddingTodoInline] = useState(false);
  const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
  const [updatingTodoIds, setUpdatingTodoIds] = useState<string[]>([]);
  const [deletingTodoIds, setDeletingTodoIds] = useState<string[]>([]);

  const remainingCount = useMemo(() => todos.filter((todo) => !todo.completed).length, [todos]);
  const completedCount = todos.length - remainingCount;

  useEffect(() => {
    let isActive = true;

    void (async () => {
      setIsWorkspaceLoading(true);
      setTodoError(null);
      setDraftTodoTitle("");
      setIsAddingTodoInline(false);
      setUpdatingTodoIds([]);
      setDeletingTodoIds([]);

      try {
        const response = await fetch(`${TODO_ENDPOINT}?workspace=${encodeURIComponent(workspaceId)}`);
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Unable to load todos."));
        }

        const data = (await response.json()) as Partial<TodoListResponse>;
        if (!isActive) {
          return;
        }

        setTodos(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setTodoError(error instanceof Error ? error.message : "Unable to load todos.");
        setTodos([]);
      } finally {
        if (isActive) {
          setIsWorkspaceLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [workspaceId]);

  async function handleSubmitTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = draftTodoTitle.trim();
    if (trimmedTitle === "") {
      setTodoError("Todo title is required.");
      return;
    }

    setIsSubmittingTodo(true);
    setTodoError(null);

    try {
      const response = await fetch(TODO_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          workspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to create todo."));
      }

      const createdTodo = (await response.json()) as Todo;
      setTodos((current) => [...current, createdTodo]);
      setDraftTodoTitle("");
      setIsAddingTodoInline(false);
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Unable to create todo.");
    } finally {
      setIsSubmittingTodo(false);
    }
  }

  async function handleToggleTodo(todo: Todo) {
    setUpdatingTodoIds((current) => [...current, todo.id]);
    setTodoError(null);

    try {
      const response = await fetch(`${TODO_ENDPOINT}/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: !todo.completed,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to update todo."));
      }

      const updatedTodo = (await response.json()) as Todo;
      setTodos((current) =>
        current.map((item) => (item.id === updatedTodo.id ? updatedTodo : item)),
      );
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Unable to update todo.");
    } finally {
      setUpdatingTodoIds((current) => current.filter((id) => id !== todo.id));
    }
  }

  async function handleDeleteTodo(todo: Todo) {
    setDeletingTodoIds((current) => [...current, todo.id]);
    setTodoError(null);

    try {
      const response = await fetch(`${TODO_ENDPOINT}/${todo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to delete todo."));
      }

      setTodos((current) => current.filter((item) => item.id !== todo.id));
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Unable to delete todo.");
    } finally {
      setDeletingTodoIds((current) => current.filter((id) => id !== todo.id));
    }
  }

  return (
    <Paper
      elevation={0}
      className="soft-panel workspace-panel"
      sx={{
        p: { xs: 3, md: 3.5 },
        borderRadius: { xs: "var(--surface-radius)", md: "var(--surface-radius-lg)" },
      }}
    >
      <Stack spacing={2} className="workspace-panel-content">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
        >
          <Box>
            <Typography variant="h6">Todos</Typography>
            <Typography color="text.secondary">
              {remainingCount} open, {completedCount} completed in {workspaceName}.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setIsAddingTodoInline(true);
              setTodoError(null);
            }}
            disabled={isAddingTodoInline}
          >
            Add item
          </Button>
        </Stack>

        {todoError ? <Alert severity="error">{todoError}</Alert> : null}

        {isAddingTodoInline ? (
          <Paper elevation={0} className="todo-row todo-row-editor">
            <Box component="form" onSubmit={handleSubmitTodo}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{ alignItems: { md: "flex-start" } }}
              >
                <TextField
                  label="New todo"
                  value={draftTodoTitle}
                  onChange={(event) => setDraftTodoTitle(event.target.value)}
                  autoFocus
                  disabled={isSubmittingTodo}
                  fullWidth
                />
                <Stack direction="row" spacing={1}>
                  <Button
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
                  </Button>
                  <Button
                    type="button"
                    variant="text"
                    color="inherit"
                    disabled={isSubmittingTodo}
                    onClick={() => {
                      setDraftTodoTitle("");
                      setTodoError(null);
                      setIsAddingTodoInline(false);
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        ) : null}

        {isWorkspaceLoading ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography>Loading todos...</Typography>
          </Stack>
        ) : null}

        {!isWorkspaceLoading && todos.length === 0 && !isAddingTodoInline && !todoError ? (
          <Paper elevation={0} className="empty-state">
            <Stack spacing={0.75}>
              <Typography variant="h6">No todos</Typography>
              <Typography color="text.secondary">
                Add an item to start using the todos app in this workspace.
              </Typography>
            </Stack>
          </Paper>
        ) : null}

        {!isWorkspaceLoading && todos.length > 0 ? (
          <Box className="todo-list-scrollbox">
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
                        <Button
                          variant={todo.completed ? "outlined" : "contained"}
                          color={todo.completed ? "inherit" : "success"}
                          disabled={isMutating}
                          onClick={() => handleToggleTodo(todo)}
                        >
                          {isUpdating ? "Saving..." : todo.completed ? "Reopen" : "Mark done"}
                        </Button>
                        <Button
                          variant="text"
                          color="error"
                          disabled={isMutating}
                          onClick={() => handleDeleteTodo(todo)}
                          aria-label={
                            isDeleting ? `Deleting ${todo.title}` : `Delete ${todo.title}`
                          }
                          startIcon={
                            isDeleting ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <DeleteOutlineRoundedIcon />
                            )
                          }
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}
