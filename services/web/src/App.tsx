import { FormEvent, useEffect, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ApiRoundedIcon from "@mui/icons-material/ApiRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

type TodoListResponse = {
  items: Todo[];
};

type ApiError = {
  error?: string;
};

const TODO_ENDPOINT = "/api/todos";

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ApiError;
    if (typeof data.error === "string" && data.error.trim() !== "") {
      return data.error;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to the provided message.
  }

  return fallback;
}

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingTodoIds, setUpdatingTodoIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTodos() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(TODO_ENDPOINT);
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Unable to load todos."));
        }

        const data = (await response.json()) as Partial<TodoListResponse>;
        if (isMounted) {
          setTodos(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Unable to load todos.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTodos();

    return () => {
      isMounted = false;
    };
  }, []);

  const remainingCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - remainingCount;
  const completionRatio =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);
  const focusTodo = todos.find((todo) => !todo.completed)?.title;
  const latestTodo = todos.at(-1)?.title;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (trimmedTitle === "") {
      setSubmitError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setActionError(null);

    try {
      const response = await fetch(TODO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to create todo."));
      }

      const createdTodo = (await response.json()) as Todo;
      setTodos((currentTodos) => [...currentTodos, createdTodo]);
      setTitle("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create todo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleTodo(todo: Todo) {
    const nextCompleted = !todo.completed;

    setActionError(null);
    setUpdatingTodoIds((currentIds) => [...currentIds, todo.id]);

    try {
      const response = await fetch(`${TODO_ENDPOINT}/${todo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: nextCompleted }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to update todo."));
      }

      const updatedTodo = (await response.json()) as Todo;
      setTodos((currentTodos) =>
        currentTodos.map((currentTodo) =>
          currentTodo.id === updatedTodo.id ? updatedTodo : currentTodo,
        ),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update todo.");
    } finally {
      setUpdatingTodoIds((currentIds) => currentIds.filter((id) => id !== todo.id));
    }
  }

  return (
    <Box component="main" className="app-shell" sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2.5, md: 3 }}>
          <Paper
            elevation={0}
            className="hero-panel"
            sx={{ p: { xs: 3, md: 4.5 }, borderRadius: { xs: "30px", md: "38px" } }}
          >
            <Stack spacing={{ xs: 3, md: 4 }} sx={{ position: "relative", zIndex: 1 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                }}
              >
                <Chip
                  icon={<AutoAwesomeRoundedIcon />}
                  label="Focused daily queue"
                  sx={{
                    bgcolor: alpha("#16423c", 0.08),
                    color: "text.primary",
                  }}
                />
                <Chip
                  icon={<ApiRoundedIcon />}
                  label="Connected to the app API"
                  sx={{
                    bgcolor: alpha("#f05d3f", 0.12),
                    color: "text.primary",
                  }}
                />
              </Stack>

              <Box className="hero-grid">
                <Stack spacing={4}>
                  <Stack spacing={2}>
                    <Typography className="section-kicker">
                      <BoltRoundedIcon sx={{ fontSize: 16 }} />
                      Daily queue
                    </Typography>
                    <Typography id="todo-heading" variant="h1">
                      Todo list
                    </Typography>
                    <Typography variant="h5" sx={{ maxWidth: 640, color: "text.secondary" }}>
                      Keep the day clear, close things out decisively, and let the interface
                      stay out of the way.
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 2,
                    }}
                  >
                    <Card elevation={0} className="metric-card">
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack spacing={1.25}>
                          <TaskAltRoundedIcon color="primary" />
                          <Typography variant="overline" color="text.secondary">
                            Queue size
                          </Typography>
                          <Typography variant="h3">{todos.length}</Typography>
                          <Typography color="text.secondary">
                            Total tasks currently tracked.
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card elevation={0} className="metric-card">
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack spacing={1.25}>
                          <RocketLaunchRoundedIcon sx={{ color: "secondary.main" }} />
                          <Typography variant="overline" color="text.secondary">
                            Items remaining
                          </Typography>
                          <Typography variant="h3">{remainingCount}</Typography>
                          <Typography color="text.secondary">
                            Work still in the active lane.
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card elevation={0} className="metric-card">
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack spacing={1.25}>
                          <CheckCircleRoundedIcon color="success" />
                          <Typography variant="overline" color="text.secondary">
                            Completion rate
                          </Typography>
                          <Typography variant="h3">{completionRatio}%</Typography>
                          <Typography color="text.secondary">
                            Finished items as a share of the list.
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Box>
                </Stack>

                <Box className="spotlight-panel">
                  <Stack spacing={2.5}>
                    <Stack spacing={1}>
                      <Typography
                        variant="overline"
                        sx={{ color: alpha("#fff6ef", 0.72) }}
                      >
                        Priority now
                      </Typography>
                      <Typography variant="h4">
                        {focusTodo ? `Next up: ${focusTodo}` : "Nothing queued yet"}
                      </Typography>
                      <Typography sx={{ color: alpha("#fff6ef", 0.72) }}>
                        {focusTodo
                          ? "Mark items done as you close them out."
                          : "Add the first task and the queue will start shaping itself."}
                      </Typography>
                    </Stack>

                    <Box>
                      <Stack
                        direction="row"
                        sx={{ mb: 1, justifyContent: "space-between", alignItems: "center" }}
                      >
                        <Typography variant="subtitle1">Queue progress</Typography>
                        <Typography variant="subtitle1">{completionRatio}%</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={completionRatio}
                        sx={{
                          height: 10,
                          borderRadius: 999,
                          bgcolor: alpha("#ffffff", 0.16),
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 999,
                            bgcolor: "secondary.main",
                          },
                        }}
                      />
                    </Box>

                    <Box className="surface-chips">
                      <Chip
                        icon={<CircleRoundedIcon sx={{ fontSize: 12 }} />}
                        label={`${remainingCount} still open`}
                        sx={{
                          bgcolor: alpha("#ffffff", 0.12),
                          color: "#fff8f2",
                        }}
                      />
                      <Chip
                        icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
                        label={`${completedCount} completed`}
                        sx={{
                          bgcolor: alpha("#ffffff", 0.12),
                          color: "#fff8f2",
                        }}
                      />
                      <Chip
                        icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
                        label={latestTodo ? `Latest added · ${latestTodo}` : "Fresh canvas"}
                        sx={{
                          maxWidth: "100%",
                          bgcolor: alpha("#ffffff", 0.12),
                          color: "#fff8f2",
                          "& .MuiChip-label": {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            className="soft-panel composer-panel"
            sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "28px", md: "34px" } }}
          >
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography className="section-kicker">
                  <AddRoundedIcon sx={{ fontSize: 16 }} />
                  Capture new work
                </Typography>
                <Typography variant="h4">Add the next move</Typography>
                <Typography color="text.secondary">
                  Keep input friction low and move straight back to the queue.
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleSubmit} aria-label="Create a todo">
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  sx={{ alignItems: { md: "flex-start" } }}
                >
                  <TextField
                    id="todo-title"
                    name="title"
                    label="New todo"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What needs doing?"
                    disabled={isSubmitting}
                    fullWidth
                    autoComplete="off"
                    helperText="Press Enter or use the button to drop it into the queue."
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting}
                    startIcon={
                      isSubmitting ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <AddRoundedIcon />
                      )
                    }
                    sx={{
                      minWidth: { md: 154 },
                      mt: { md: "4px" },
                      alignSelf: "flex-start",
                    }}
                  >
                    {isSubmitting ? "Adding…" : "Add todo"}
                  </Button>
                </Stack>
              </Box>

              {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            className="soft-panel todo-surface"
            sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: "30px", md: "38px" } }}
          >
            <Stack spacing={3} sx={{ position: "relative", zIndex: 1 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", md: "flex-end" },
                }}
              >
                <Box>
                  <Typography className="section-kicker">
                    <TaskAltRoundedIcon sx={{ fontSize: 16 }} />
                    Active queue
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 1 }}>
                    Close work cleanly
                  </Typography>
                </Box>
                <Box className="surface-chips">
                  <Chip
                    icon={<RocketLaunchRoundedIcon />}
                    label={`Open queue · ${remainingCount}`}
                    sx={{
                      bgcolor: alpha("#16423c", 0.08),
                      color: "text.primary",
                    }}
                  />
                  <Chip
                    icon={<CheckCircleRoundedIcon />}
                    label={`Completed · ${completedCount}`}
                    sx={{
                      bgcolor: alpha("#2d7f5e", 0.1),
                      color: "text.primary",
                    }}
                  />
                </Box>
              </Stack>

              {loadError ? <Alert severity="error">{loadError}</Alert> : null}
              {actionError ? <Alert severity="error">{actionError}</Alert> : null}

              {isLoading ? (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <CircularProgress size={20} />
                  <Typography>Loading todos…</Typography>
                </Stack>
              ) : null}

              {!isLoading && !loadError ? (
                <>
                  <Typography color="text.secondary">{remainingCount} items remaining</Typography>

                  {todos.length === 0 ? (
                    <Paper
                      elevation={0}
                      className="empty-state"
                      sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: "24px", md: "28px" } }}
                    >
                      <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
                        <Chip
                          icon={<AutoAwesomeRoundedIcon />}
                          label="Fresh canvas"
                          sx={{
                            bgcolor: alpha("#f05d3f", 0.1),
                            color: "text.primary",
                          }}
                        />
                        <Typography variant="h5">No todos yet. Add your first item above.</Typography>
                        <Typography color="text.secondary">
                          The queue becomes useful the moment the first task lands.
                        </Typography>
                      </Stack>
                    </Paper>
                  ) : (
                    <Box component="ul" className="todo-list" aria-label="Todo items">
                      {todos.map((todo, index) => {
                        const isComplete = todo.completed;
                        const isUpdating = updatingTodoIds.includes(todo.id);

                        return (
                          <Card
                            key={todo.id}
                            component="li"
                            elevation={0}
                            className="todo-card"
                            sx={{
                              listStyle: "none",
                              border: "1px solid",
                              borderColor: alpha("#14221d", isComplete ? 0.08 : 0.1),
                              bgcolor: isComplete
                                ? alpha("#2d7f5e", 0.08)
                                : alpha("#ffffff", 0.68),
                              opacity: isUpdating ? 0.78 : 1,
                            }}
                          >
                            <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                              <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={2}
                                sx={{
                                  justifyContent: "space-between",
                                  alignItems: { xs: "flex-start", md: "center" },
                                }}
                              >
                                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                                  <Box
                                    className={`todo-index${isComplete ? " todo-index-done" : ""}`}
                                  >
                                    {String(index + 1).padStart(2, "0")}
                                  </Box>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                      variant="h5"
                                      className={isComplete ? "todo-title-done" : undefined}
                                    >
                                      {todo.title}
                                    </Typography>
                                    <Typography color="text.secondary">
                                      {isComplete
                                        ? "Completed and ready to archive mentally."
                                        : "Open and ready for action."}
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  spacing={1}
                                  sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                                >
                                  <Chip
                                    icon={
                                      isComplete ? (
                                        <CheckCircleRoundedIcon />
                                      ) : (
                                        <CircleRoundedIcon sx={{ fontSize: 14 }} />
                                      )
                                    }
                                    label={isComplete ? "Completed" : "Open"}
                                    color={isComplete ? "success" : "warning"}
                                    variant={isComplete ? "filled" : "outlined"}
                                  />
                                  <Button
                                    variant={isComplete ? "outlined" : "contained"}
                                    color={isComplete ? "inherit" : "success"}
                                    disabled={isUpdating}
                                    onClick={() => void handleToggleTodo(todo)}
                                    startIcon={
                                      isUpdating ? (
                                        <CircularProgress size={16} color="inherit" />
                                      ) : isComplete ? (
                                        <AutorenewRoundedIcon />
                                      ) : (
                                        <DoneRoundedIcon />
                                      )
                                    }
                                    aria-label={
                                      isComplete
                                        ? `Mark ${todo.title} as open`
                                        : `Mark ${todo.title} as done`
                                    }
                                    sx={{ minWidth: 132 }}
                                  >
                                    {isUpdating ? "Saving…" : isComplete ? "Reopen" : "Mark done"}
                                  </Button>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  )}
                </>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
