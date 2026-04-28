import { FormEvent, useEffect, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
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

import { readErrorMessage, TODO_ENDPOINT, TODO_STREAM_ENDPOINT } from "../app/api";
import { Todo, TodoFeatureProps, TodoListResponse } from "../app/types";

const createdAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type TodoSections = {
  todoItems: Todo[];
  doneItems: Todo[];
};

function parseCreatedAt(createdAt?: string) {
  if (!createdAt) {
    return null;
  }

  const parsed = Date.parse(createdAt);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareTodosByCreatedAt(left: Todo, right: Todo) {
  const leftCreatedAt = parseCreatedAt(left.createdAt);
  const rightCreatedAt = parseCreatedAt(right.createdAt);

  if (leftCreatedAt !== null && rightCreatedAt !== null && leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }
  if (leftCreatedAt !== null && rightCreatedAt === null) {
    return -1;
  }
  if (leftCreatedAt === null && rightCreatedAt !== null) {
    return 1;
  }

  return left.id.localeCompare(right.id, undefined, { numeric: true });
}

function formatCreatedAt(createdAt?: string) {
  const parsed = parseCreatedAt(createdAt);
  if (parsed === null) {
    return null;
  }

  return `Created ${createdAtFormatter.format(parsed)}`;
}

function emptyTodoSections(): TodoSections {
  return {
    todoItems: [],
    doneItems: [],
  };
}

function normalizeTodoSections(data: Partial<TodoListResponse>): TodoSections {
  const todoItems = Array.isArray(data.todoItems) ? data.todoItems : [];
  const doneItems = Array.isArray(data.doneItems) ? data.doneItems : [];
  const orderedTodoItems = [...todoItems].sort(compareTodosByCreatedAt);
  const orderedDoneItems = [...doneItems].sort(compareTodosByCreatedAt);

  return {
    todoItems: orderedTodoItems,
    doneItems: orderedDoneItems,
  };
}

function splitTodoSections(items: Todo[]): TodoSections {
  const todoItems: Todo[] = [];
  const doneItems: Todo[] = [];

  for (const item of items) {
    if (item.completed) {
      doneItems.push(item);
      continue;
    }

    todoItems.push(item);
  }

  return normalizeTodoSections({ todoItems, doneItems });
}

async function fetchTodosForWorkspace(workspaceId: string) {
  const response = await fetch(`${TODO_ENDPOINT}?workspace=${encodeURIComponent(workspaceId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to load todos."));
  }

  const data = (await response.json()) as Partial<TodoListResponse>;
  return normalizeTodoSections(data);
}

export default function TodoFeature({
  workspaceId,
  workspaceName,
  currentUserEmail,
}: TodoFeatureProps) {
  const [todoSections, setTodoSections] = useState<TodoSections>(emptyTodoSections);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [draftTodoTitle, setDraftTodoTitle] = useState("");
  const [isAddingTodoInline, setIsAddingTodoInline] = useState(false);
  const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
  const [updatingTodoIds, setUpdatingTodoIds] = useState<string[]>([]);
  const [deletingTodoIds, setDeletingTodoIds] = useState<string[]>([]);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState("");

  const openTodos = todoSections.todoItems;
  const completedTodos = todoSections.doneItems;
  const totalTodos = openTodos.length + completedTodos.length;
  const remainingCount = openTodos.length;
  const completedCount = completedTodos.length;

  useEffect(() => {
    let isActive = true;

    void (async () => {
      setIsWorkspaceLoading(true);
      setTodoError(null);
      setDraftTodoTitle("");
      setIsAddingTodoInline(false);
      setUpdatingTodoIds([]);
      setDeletingTodoIds([]);
      setEditingTodoId(null);
      setEditingTodoTitle("");

      try {
        const items = await fetchTodosForWorkspace(workspaceId);
        if (!isActive) {
          return;
        }

        setTodoSections(items);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setTodoError(error instanceof Error ? error.message : "Unable to load todos.");
        setTodoSections(emptyTodoSections());
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

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return;
    }

    let isActive = true;
    const eventSource = new EventSource(
      `${TODO_STREAM_ENDPOINT}?workspace=${encodeURIComponent(workspaceId)}`,
    );

    eventSource.onmessage = () => {
      void (async () => {
        try {
          const items = await fetchTodosForWorkspace(workspaceId);
          if (!isActive) {
            return;
          }

          setTodoError(null);
          setTodoSections(items);
        } catch (error) {
          if (!isActive) {
            return;
          }

          setTodoError(error instanceof Error ? error.message : "Unable to load todos.");
        }
      })();
    };

    return () => {
      isActive = false;
      eventSource.close();
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
      setTodoSections((current) =>
        splitTodoSections([...current.todoItems, ...current.doneItems, createdTodo]),
      );
      setDraftTodoTitle("");
      setIsAddingTodoInline(false);
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Unable to create todo.");
    } finally {
      setIsSubmittingTodo(false);
    }
  }

  async function handleUpdateTodo(
    todoId: string,
    updates: Partial<Pick<Todo, "completed" | "title">>,
  ) {
    setUpdatingTodoIds((current) => [...current, todoId]);
    setTodoError(null);

    try {
      const response = await fetch(`${TODO_ENDPOINT}/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to update todo."));
      }

      const updatedTodo = (await response.json()) as Todo;
      setTodoSections((current) =>
        splitTodoSections(
          [...current.todoItems, ...current.doneItems].map((item) =>
            item.id === updatedTodo.id ? updatedTodo : item,
          ),
        ),
      );
      return updatedTodo;
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Unable to update todo.");
      return null;
    } finally {
      setUpdatingTodoIds((current) => current.filter((id) => id !== todoId));
    }
  }

  async function handleToggleTodo(todo: Todo) {
    await handleUpdateTodo(todo.id, {
      completed: !todo.completed,
    });
  }

  function handleStartEditingTodo(todo: Todo) {
    setEditingTodoId(todo.id);
    setEditingTodoTitle(todo.title);
    setTodoError(null);
  }

  function handleCancelEditingTodo() {
    setEditingTodoId(null);
    setEditingTodoTitle("");
    setTodoError(null);
  }

  async function handleSubmitTodoEdit(todo: Todo) {
    const trimmedTitle = editingTodoTitle.trim();
    if (trimmedTitle === "") {
      setTodoError("Todo title is required.");
      return;
    }

    const updatedTodo = await handleUpdateTodo(todo.id, {
      title: trimmedTitle,
    });
    if (!updatedTodo) {
      return;
    }

    handleCancelEditingTodo();
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

      setTodoSections((current) =>
        splitTodoSections(
          [...current.todoItems, ...current.doneItems].filter((item) => item.id !== todo.id),
        ),
      );
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

        {!isWorkspaceLoading && totalTodos === 0 && !isAddingTodoInline && !todoError ? (
          <Paper elevation={0} className="empty-state">
            <Stack spacing={0.75}>
              <Typography variant="h6">No todos</Typography>
              <Typography color="text.secondary">
                Add an item to start using the todos app in this workspace.
              </Typography>
            </Stack>
          </Paper>
        ) : null}

        {!isWorkspaceLoading && totalTodos > 0 ? (
          <Box className="todo-list-scrollbox">
            <Stack spacing={2.5} className="todo-sections">
              {openTodos.length > 0 ? (
                <Stack spacing={1.25} className="todo-section">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: "center" }}
                  >
                    <Typography variant="subtitle1">Todo</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {openTodos.length}
                    </Typography>
                  </Stack>
                  <Box component="ul" className="todo-list" aria-label="Todo items">
                    {openTodos.map((todo) => {
                      const isUpdating = updatingTodoIds.includes(todo.id);
                      const isDeleting = deletingTodoIds.includes(todo.id);
                      const isMutating = isUpdating || isDeleting;
                      const isEditing = editingTodoId === todo.id;
                      const ownerLabel =
                        todo.ownerEmail === currentUserEmail
                          ? "Owned by you"
                          : `Owned by ${todo.ownerEmail}`;
                      const createdAtLabel = formatCreatedAt(todo.createdAt);

                      return (
                        <Paper
                          key={todo.id}
                          component="li"
                          elevation={0}
                          className="todo-row"
                          sx={{ opacity: isMutating ? 0.7 : 1 }}
                        >
                          {isEditing ? (
                            <Box
                              component="form"
                              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                                event.preventDefault();
                                void handleSubmitTodoEdit(todo);
                              }}
                            >
                              <Stack spacing={1.25}>
                                <TextField
                                  label="Todo title"
                                  value={editingTodoTitle}
                                  onChange={(event) => setEditingTodoTitle(event.target.value)}
                                  autoFocus
                                  disabled={isMutating}
                                  fullWidth
                                />
                                <Stack direction="row" spacing={1} className="todo-actions">
                                  <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={isMutating}
                                  >
                                    {isUpdating ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="text"
                                    color="inherit"
                                    disabled={isMutating}
                                    onClick={handleCancelEditingTodo}
                                  >
                                    Cancel
                                  </Button>
                                </Stack>
                              </Stack>
                            </Box>
                          ) : (
                            <Stack
                              direction={{ xs: "column", md: "row" }}
                              spacing={1.5}
                              sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
                            >
                              <Box sx={{ minWidth: 0 }} className="todo-copy">
                                <Typography variant="subtitle1">{todo.title}</Typography>
                                <Stack spacing={0.25} className="todo-meta">
                                  <Typography color="text.secondary">{ownerLabel}</Typography>
                                  {createdAtLabel ? (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      className="todo-created-at"
                                    >
                                      {createdAtLabel}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </Box>

                              <Stack direction="row" spacing={1} className="todo-actions">
                                <Button
                                  variant="outlined"
                                  color="inherit"
                                  disabled={isMutating}
                                  onClick={() => handleStartEditingTodo(todo)}
                                  startIcon={<EditRoundedIcon />}
                                >
                                  Edit title
                                </Button>
                                <Button
                                  variant="contained"
                                  color="success"
                                  disabled={isMutating}
                                  onClick={() => handleToggleTodo(todo)}
                                >
                                  {isUpdating ? "Saving..." : "Mark done"}
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
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                </Stack>
              ) : null}

              {completedTodos.length > 0 ? (
                <Stack spacing={1.25} className="todo-section">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: "center" }}
                  >
                    <Typography variant="subtitle1">Done</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {completedTodos.length}
                    </Typography>
                  </Stack>
                  <Box component="ul" className="todo-list" aria-label="Done items">
                    {completedTodos.map((todo) => {
                      const isUpdating = updatingTodoIds.includes(todo.id);
                      const isDeleting = deletingTodoIds.includes(todo.id);
                      const isMutating = isUpdating || isDeleting;
                      const isEditing = editingTodoId === todo.id;
                      const ownerLabel =
                        todo.ownerEmail === currentUserEmail
                          ? "Owned by you"
                          : `Owned by ${todo.ownerEmail}`;
                      const createdAtLabel = formatCreatedAt(todo.createdAt);

                      return (
                        <Paper
                          key={todo.id}
                          component="li"
                          elevation={0}
                          className="todo-row todo-row-done"
                          sx={{ opacity: isMutating ? 0.7 : 1 }}
                        >
                          {isEditing ? (
                            <Box
                              component="form"
                              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                                event.preventDefault();
                                void handleSubmitTodoEdit(todo);
                              }}
                            >
                              <Stack spacing={1.25}>
                                <TextField
                                  label="Todo title"
                                  value={editingTodoTitle}
                                  onChange={(event) => setEditingTodoTitle(event.target.value)}
                                  autoFocus
                                  disabled={isMutating}
                                  fullWidth
                                />
                                <Stack direction="row" spacing={1} className="todo-actions">
                                  <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={isMutating}
                                  >
                                    {isUpdating ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="text"
                                    color="inherit"
                                    disabled={isMutating}
                                    onClick={handleCancelEditingTodo}
                                  >
                                    Cancel
                                  </Button>
                                </Stack>
                              </Stack>
                            </Box>
                          ) : (
                            <Stack
                              direction={{ xs: "column", md: "row" }}
                              spacing={1.5}
                              sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
                            >
                              <Box sx={{ minWidth: 0 }} className="todo-copy">
                                <Typography variant="subtitle1" className="todo-title-done">
                                  {todo.title}
                                </Typography>
                                <Stack spacing={0.25} className="todo-meta">
                                  <Typography color="text.secondary">{ownerLabel}</Typography>
                                  {createdAtLabel ? (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      className="todo-created-at"
                                    >
                                      {createdAtLabel}
                                    </Typography>
                                  ) : null}
                                  <Typography variant="caption" color="text.secondary">
                                    Completed
                                  </Typography>
                                </Stack>
                              </Box>

                              <Stack direction="row" spacing={1} className="todo-actions">
                                <Button
                                  variant="outlined"
                                  color="inherit"
                                  disabled={isMutating}
                                  onClick={() => handleStartEditingTodo(todo)}
                                  startIcon={<EditRoundedIcon />}
                                >
                                  Edit title
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="inherit"
                                  disabled={isMutating}
                                  onClick={() => handleToggleTodo(todo)}
                                >
                                  {isUpdating ? "Saving..." : "Reopen"}
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
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                </Stack>
              ) : null}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}
