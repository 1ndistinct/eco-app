import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
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
  ownerEmail: string;
  workspaceEmail: string;
};

type TodoListResponse = {
  items: Todo[];
  workspaceEmail: string;
};

type WorkspaceAccess = {
  ownerEmail: string;
  role: "owner" | "collaborator";
};

type WorkspaceShare = {
  workspaceEmail: string;
  email: string;
};

type ShareListResponse = {
  items: WorkspaceShare[];
  workspaceEmail: string;
};

type SessionUser = {
  email: string;
  passwordResetRequired: boolean;
};

type SessionState = {
  authenticated: boolean;
  googleLoginEnabled?: boolean;
  googleLoginURL?: string;
  user?: SessionUser;
  accessibleWorkspaces?: WorkspaceAccess[];
};

type ApiError = {
  error?: string;
};

const SESSION_ENDPOINT = "/api/auth/session";
const LOGIN_ENDPOINT = "/api/auth/login";
const LOGOUT_ENDPOINT = "/api/auth/logout";
const RESET_PASSWORD_ENDPOINT = "/api/auth/reset-password";
const TODO_ENDPOINT = "/api/todos";
const SHARE_ENDPOINT = "/api/shares";

const UNAUTHENTICATED_SESSION: SessionState = {
  authenticated: false,
  googleLoginEnabled: false,
  googleLoginURL: "",
  accessibleWorkspaces: [],
};
const EMPTY_WORKSPACES: WorkspaceAccess[] = [];

function normalizeSessionState(data: Partial<SessionState>): SessionState {
  return {
    authenticated: data.authenticated === true,
    googleLoginEnabled: data.googleLoginEnabled === true,
    googleLoginURL: data.googleLoginURL ?? "",
    user: data.user,
    accessibleWorkspaces: Array.isArray(data.accessibleWorkspaces)
      ? data.accessibleWorkspaces
      : [],
  };
}

function authErrorMessage(code: string) {
  switch (code) {
    case "google_login_unavailable":
      return "Google login is not configured for this deployment.";
    case "google_login_cancelled":
      return "Google login was cancelled before it completed.";
    case "google_login_expired":
      return "Google login expired. Start the sign-in flow again.";
    case "google_email_not_verified":
      return "Google login requires a verified email address.";
    case "google_email_not_supported":
      return "Google login is limited to existing users with a Gmail address.";
    case "google_account_not_allowed":
      return "That Google account does not match an existing user in this app.";
    case "google_login_failed":
      return "Google login failed. Try again.";
    default:
      return "Unable to complete Google login.";
  }
}

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
  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [shares, setShares] = useState<WorkspaceShare[]>([]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [todoTitle, setTodoTitle] = useState("");
  const [shareEmail, setShareEmail] = useState("");

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingPasswordReset, setIsSubmittingPasswordReset] = useState(false);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [updatingTodoIds, setUpdatingTodoIds] = useState<string[]>([]);
  const [deletingTodoIds, setDeletingTodoIds] = useState<string[]>([]);

  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const currentUser = session?.user;
  const isAuthenticated = session?.authenticated === true;
  const googleLoginEnabled = session?.googleLoginEnabled === true;
  const googleLoginURL = session?.googleLoginURL ?? "";
  const requiresPasswordReset = currentUser?.passwordResetRequired === true;
  const accessibleWorkspaces = session?.accessibleWorkspaces ?? EMPTY_WORKSPACES;
  const currentWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.ownerEmail === selectedWorkspace,
  );
  const collaboratorEmails = useMemo(
    () =>
      shares
        .map((share) => share.email)
        .filter((email, index, emails) => emails.indexOf(email) === index),
    [shares],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (!authError) {
      return;
    }

    setLoginError(authErrorMessage(authError));
    params.delete("authError");
    const nextQuery = params.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextURL);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setIsInitializing(true);
      setSessionError(null);

      try {
        const response = await fetch(SESSION_ENDPOINT);
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Unable to load the current session."));
        }

        const data = (await response.json()) as SessionState;
        if (isMounted) {
          setSession(normalizeSessionState(data));
        }
      } catch (error) {
        if (isMounted) {
          setSessionError(
            error instanceof Error ? error.message : "Unable to load the current session.",
          );
          setSession(UNAUTHENTICATED_SESSION);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || requiresPasswordReset) {
      setSelectedWorkspace("");
      setTodos([]);
      setShares([]);
      return;
    }

    if (accessibleWorkspaces.length === 0) {
      setSelectedWorkspace("");
      return;
    }

    setSelectedWorkspace((currentWorkspaceEmail) => {
      if (
        currentWorkspaceEmail !== "" &&
        accessibleWorkspaces.some((workspace) => workspace.ownerEmail === currentWorkspaceEmail)
      ) {
        return currentWorkspaceEmail;
      }

      return currentUser?.email ?? accessibleWorkspaces[0].ownerEmail;
    });
  }, [accessibleWorkspaces, currentUser?.email, isAuthenticated, requiresPasswordReset]);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspaceData() {
      if (!isAuthenticated || requiresPasswordReset || selectedWorkspace === "") {
        return;
      }

      setIsWorkspaceLoading(true);
      setWorkspaceError(null);
      setTodoError(null);
      setShareError(null);
      setShareSuccess(null);

      try {
        const [todoResponse, shareResponse] = await Promise.all([
          fetch(`${TODO_ENDPOINT}?workspace=${encodeURIComponent(selectedWorkspace)}`),
          fetch(`${SHARE_ENDPOINT}?workspace=${encodeURIComponent(selectedWorkspace)}`),
        ]);

        if (todoResponse.status === 401 || shareResponse.status === 401) {
          if (isMounted) {
            setSession(UNAUTHENTICATED_SESSION);
          }
          return;
        }
        if (!todoResponse.ok) {
          throw new Error(await readErrorMessage(todoResponse, "Unable to load todos."));
        }
        if (!shareResponse.ok) {
          throw new Error(await readErrorMessage(shareResponse, "Unable to load collaborators."));
        }

        const todoData = (await todoResponse.json()) as Partial<TodoListResponse>;
        const shareData = (await shareResponse.json()) as Partial<ShareListResponse>;

        if (isMounted) {
          setTodos(Array.isArray(todoData.items) ? todoData.items : []);
          setShares(Array.isArray(shareData.items) ? shareData.items : []);
        }
      } catch (error) {
        if (isMounted) {
          setWorkspaceError(
            error instanceof Error ? error.message : "Unable to load the selected workspace.",
          );
        }
      } finally {
        if (isMounted) {
          setIsWorkspaceLoading(false);
        }
      }
    }

    void loadWorkspaceData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, requiresPasswordReset, selectedWorkspace]);

  const remainingCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - remainingCount;
  const completionRatio =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);
  const focusTodo = todos.find((todo) => !todo.completed)?.title;

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loginEmail.trim() === "" || loginPassword.trim() === "") {
      setLoginError("Email and password are required.");
      return;
    }

    setIsSubmittingLogin(true);
    setLoginError(null);
    setSessionError(null);

    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to log in."));
      }

      const data = (await response.json()) as SessionState;
      setSession(normalizeSessionState(data));
      setResetNewPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to log in.");
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (resetNewPassword.trim() === "") {
      setResetError("New password is required.");
      return;
    }

    setIsSubmittingPasswordReset(true);
    setResetError(null);

    try {
      const response = await fetch(RESET_PASSWORD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: resetNewPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to reset the password."));
      }

      const data = (await response.json()) as SessionState;
      setSession(normalizeSessionState(data));
      setResetNewPassword("");
    } catch (error) {
      setResetError(
        error instanceof Error ? error.message : "Unable to reset the password.",
      );
    } finally {
      setIsSubmittingPasswordReset(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(LOGOUT_ENDPOINT, { method: "POST" });

      const response = await fetch(SESSION_ENDPOINT);
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to load the current session."));
      }

      const data = (await response.json()) as SessionState;
      setSession(normalizeSessionState(data));
      setSessionError(null);
    } catch {
      setSession(UNAUTHENTICATED_SESSION);
    }
    setLoginPassword("");
    setSelectedWorkspace("");
    setTodos([]);
    setShares([]);
    setShareSuccess(null);
    setUpdatingTodoIds([]);
    setDeletingTodoIds([]);
  }

  async function handleSubmitTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = todoTitle.trim();
    if (trimmedTitle === "") {
      setTodoError("Title is required.");
      return;
    }

    setIsSubmittingTodo(true);
    setTodoError(null);

    try {
      const response = await fetch(TODO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          workspaceEmail: selectedWorkspace,
        }),
      });

      if (response.status === 401) {
        setSession(UNAUTHENTICATED_SESSION);
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to create todo."));
      }

      const createdTodo = (await response.json()) as Todo;
      setTodos((currentTodos) => [...currentTodos, createdTodo]);
      setTodoTitle("");
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Unable to create todo.");
    } finally {
      setIsSubmittingTodo(false);
    }
  }

  async function handleToggleTodo(todo: Todo) {
    const nextCompleted = !todo.completed;

    setTodoError(null);
    setUpdatingTodoIds((currentIds) => [...currentIds, todo.id]);

    try {
      const response = await fetch(`${TODO_ENDPOINT}/${todo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: nextCompleted }),
      });

      if (response.status === 401) {
        setSession(UNAUTHENTICATED_SESSION);
        return;
      }
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
      setTodoError(error instanceof Error ? error.message : "Unable to update todo.");
    } finally {
      setUpdatingTodoIds((currentIds) => currentIds.filter((id) => id !== todo.id));
    }
  }

  async function handleDeleteTodo(todo: Todo) {
    setTodoError(null);
    setDeletingTodoIds((currentIds) => [...currentIds, todo.id]);

    try {
      const response = await fetch(`${TODO_ENDPOINT}/${todo.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        setSession(UNAUTHENTICATED_SESSION);
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to delete todo."));
      }

      setTodos((currentTodos) => currentTodos.filter((currentTodo) => currentTodo.id !== todo.id));
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Unable to delete todo.");
    } finally {
      setDeletingTodoIds((currentIds) => currentIds.filter((id) => id !== todo.id));
    }
  }

  async function handleShareWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (shareEmail.trim() === "") {
      setShareError("Collaborator email is required.");
      return;
    }

    setIsSubmittingShare(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const response = await fetch(SHARE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceEmail: selectedWorkspace,
          email: shareEmail.trim(),
        }),
      });

      if (response.status === 401) {
        setSession(UNAUTHENTICATED_SESSION);
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to share the workspace."));
      }

      const createdShare = (await response.json()) as WorkspaceShare;
      setShares((currentShares) => {
        if (currentShares.some((share) => share.email === createdShare.email)) {
          return currentShares;
        }

        return [...currentShares, createdShare];
      });
      setShareEmail("");
      setShareSuccess(`Shared with ${createdShare.email}.`);
    } catch (error) {
      setShareError(
        error instanceof Error ? error.message : "Unable to share the workspace.",
      );
    } finally {
      setIsSubmittingShare(false);
    }
  }

  function renderAuthShell(
    title: string,
    subtitle: string,
    content: ReactNode,
    helper?: ReactNode,
  ) {
    return (
      <Box component="main" className="app-shell" sx={{ py: { xs: 4, md: 6 } }}>
        <Container maxWidth="sm">
          <Stack spacing={3}>
            <Paper
              elevation={0}
              className="hero-panel"
              sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: "28px", md: "34px" } }}
            >
              <Stack spacing={2.5}>
                <Chip
                  icon={<VpnKeyRoundedIcon />}
                  label="Private workspace access"
                  sx={{
                    alignSelf: "flex-start",
                    bgcolor: alpha("#16423c", 0.08),
                    color: "text.primary",
                  }}
                />
                <Typography variant="h2">{title}</Typography>
                <Typography color="text.secondary">{subtitle}</Typography>
                {helper}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              className="soft-panel auth-panel"
              sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "26px", md: "30px" } }}
            >
              {content}
            </Paper>
          </Stack>
        </Container>
      </Box>
    );
  }

  if (isInitializing) {
    return renderAuthShell(
      "Loading the workspace",
      "Checking for an existing session before the UI decides which flow to show.",
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <CircularProgress size={20} />
        <Typography>Loading session…</Typography>
      </Stack>,
      sessionError ? <Alert severity="error">{sessionError}</Alert> : undefined,
    );
  }

  if (!isAuthenticated) {
    return renderAuthShell(
      "Log in to your queue",
      "Every workspace is private until it is explicitly shared. Use the credentials provisioned for your account.",
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography className="section-kicker">
            <PersonRoundedIcon sx={{ fontSize: 16 }} />
            Sign in
          </Typography>
          <Typography variant="h4">Workspace login</Typography>
        </Stack>
        {googleLoginEnabled && googleLoginURL ? (
          <Stack spacing={1.5}>
            <Button
              component="a"
              href={googleLoginURL}
              variant="outlined"
              color="inherit"
              sx={{ alignSelf: "flex-start" }}
            >
              Continue with Google
            </Button>
            <Typography color="text.secondary" variant="body2">
              Google login succeeds only when the verified Google account is a Gmail address
              that exactly matches an existing user in this app.
            </Typography>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: "0.22em" }}
            >
              or use the provisioned password
            </Typography>
          </Stack>
        ) : null}
        <Box component="form" onSubmit={handleLogin}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              autoComplete="email"
              disabled={isSubmittingLogin}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isSubmittingLogin}
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmittingLogin}
              startIcon={
                isSubmittingLogin ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <VpnKeyRoundedIcon />
                )
              }
              sx={{ alignSelf: "flex-start" }}
            >
              {isSubmittingLogin ? "Logging in…" : "Log in"}
            </Button>
          </Stack>
        </Box>
        {loginError ? <Alert severity="error">{loginError}</Alert> : null}
      </Stack>,
      sessionError ? <Alert severity="error">{sessionError}</Alert> : undefined,
    );
  }

  if (requiresPasswordReset) {
    return renderAuthShell(
      "Choose a password to finish setup",
      "The account is authenticated, but the workspace stays locked until a permanent password is set.",
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography className="section-kicker">
            <VpnKeyRoundedIcon sx={{ fontSize: 16 }} />
            Account setup
          </Typography>
          <Typography variant="h4">{currentUser?.email}</Typography>
          <Typography color="text.secondary">
            This works the same whether you arrived with Google login or the temporary password.
          </Typography>
        </Stack>
        <Box component="form" onSubmit={handlePasswordReset}>
          <Stack spacing={2}>
            <TextField
              label="New password"
              type="password"
              value={resetNewPassword}
              onChange={(event) => setResetNewPassword(event.target.value)}
              autoComplete="new-password"
              helperText="Use at least 12 characters."
              disabled={isSubmittingPasswordReset}
              fullWidth
            />
            <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap" }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmittingPasswordReset}
                startIcon={
                  isSubmittingPasswordReset ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <DoneRoundedIcon />
                  )
                }
              >
                {isSubmittingPasswordReset ? "Saving…" : "Save password"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                onClick={() => void handleLogout()}
                startIcon={<LogoutRoundedIcon />}
              >
                Log out
              </Button>
            </Stack>
          </Stack>
        </Box>
        {resetError ? <Alert severity="error">{resetError}</Alert> : null}
      </Stack>,
    );
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
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", md: "center" },
                }}
              >
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Chip
                    icon={<PersonRoundedIcon />}
                    label={`Signed in as ${currentUser?.email}`}
                    sx={{
                      bgcolor: alpha("#16423c", 0.08),
                      color: "text.primary",
                    }}
                  />
                  <Chip
                    icon={<ShareRoundedIcon />}
                    label={`${accessibleWorkspaces.length} accessible workspace${accessibleWorkspaces.length === 1 ? "" : "s"}`}
                    sx={{
                      bgcolor: alpha("#f05d3f", 0.12),
                      color: "text.primary",
                    }}
                  />
                </Stack>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => void handleLogout()}
                  startIcon={<LogoutRoundedIcon />}
                >
                  Log out
                </Button>
              </Stack>

              <Box className="hero-grid">
                <Stack spacing={4}>
                  <Stack spacing={2}>
                    <Typography className="section-kicker">
                      <BoltRoundedIcon sx={{ fontSize: 16 }} />
                      Shared todo workspaces
                    </Typography>
                    <Typography id="todo-heading" variant="h1">
                      Shared queues, explicit owners
                    </Typography>
                    <Typography variant="h5" sx={{ maxWidth: 700, color: "text.secondary" }}>
                      Every queue belongs to a user, every collaborator is explicit, and the
                      current workspace stays obvious while you work inside it.
                    </Typography>
                  </Stack>

                  <Stack spacing={1.5}>
                    <Typography variant="overline" color="text.secondary">
                      Accessible workspaces
                    </Typography>
                    <Box className="workspace-chip-group" role="tablist" aria-label="Workspaces">
                      {accessibleWorkspaces.map((workspace) => {
                        const isSelected = workspace.ownerEmail === selectedWorkspace;

                        return (
                          <Chip
                            key={workspace.ownerEmail}
                            label={workspace.ownerEmail}
                            color={isSelected ? "primary" : "default"}
                            variant={isSelected ? "filled" : "outlined"}
                            onClick={() => setSelectedWorkspace(workspace.ownerEmail)}
                            role="tab"
                            aria-selected={isSelected}
                          />
                        );
                      })}
                    </Box>
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
                            Total tasks in the selected workspace.
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
                            Work still open in this queue.
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
                            Closed items as a share of the full workspace queue.
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Box>
                </Stack>

                <Box className="spotlight-panel">
                  <Stack spacing={2.5}>
                    <Stack spacing={1}>
                      <Typography variant="overline" sx={{ color: alpha("#fff6ef", 0.72) }}>
                        Selected workspace
                      </Typography>
                      <Typography variant="h4">
                        {selectedWorkspace || currentUser?.email}
                      </Typography>
                      <Typography sx={{ color: alpha("#fff6ef", 0.72) }}>
                        {focusTodo
                          ? `Priority now: ${focusTodo}`
                          : "Add the first task or switch workspaces to pick something up."}
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
                        icon={<PersonRoundedIcon sx={{ fontSize: 16 }} />}
                        label={
                          currentWorkspace?.role === "owner" ? "Owner access" : "Collaborator access"
                        }
                        sx={{
                          bgcolor: alpha("#ffffff", 0.12),
                          color: "#fff8f2",
                        }}
                      />
                      <Chip
                        icon={<GroupRoundedIcon sx={{ fontSize: 16 }} />}
                        label={`${collaboratorEmails.length} collaborator${collaboratorEmails.length === 1 ? "" : "s"}`}
                        sx={{
                          bgcolor: alpha("#ffffff", 0.12),
                          color: "#fff8f2",
                        }}
                      />
                      <Chip
                        icon={<CircleRoundedIcon sx={{ fontSize: 12 }} />}
                        label={`${remainingCount} open`}
                        sx={{
                          bgcolor: alpha("#ffffff", 0.12),
                          color: "#fff8f2",
                        }}
                      />
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Stack>
          </Paper>

          <Box className="utility-grid">
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
                    New items land inside <strong>{selectedWorkspace}</strong> and stay owned by
                    the user who creates them.
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleSubmitTodo} aria-label="Create a todo">
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    sx={{ alignItems: { md: "flex-start" } }}
                  >
                    <TextField
                      id="todo-title"
                      name="title"
                      label="New todo"
                      value={todoTitle}
                      onChange={(event) => setTodoTitle(event.target.value)}
                      placeholder="What needs doing?"
                      disabled={isSubmittingTodo}
                      fullWidth
                      autoComplete="off"
                      helperText="Press Enter or use the button to drop it into the active workspace."
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmittingTodo || selectedWorkspace === ""}
                      startIcon={
                        isSubmittingTodo ? (
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
                      {isSubmittingTodo ? "Adding…" : "Add todo"}
                    </Button>
                  </Stack>
                </Box>

                {todoError ? <Alert severity="error">{todoError}</Alert> : null}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              className="soft-panel share-panel"
              sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "28px", md: "34px" } }}
            >
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Typography className="section-kicker">
                    <ShareRoundedIcon sx={{ fontSize: 16 }} />
                    Workspace sharing
                  </Typography>
                  <Typography variant="h4">Invite collaborators</Typography>
                  <Typography color="text.secondary">
                    Everyone added here can see, edit, and re-share the current workspace.
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleShareWorkspace}>
                  <Stack spacing={1.5}>
                    <TextField
                      label="Collaborator email"
                      type="email"
                      value={shareEmail}
                      onChange={(event) => setShareEmail(event.target.value)}
                      autoComplete="email"
                      disabled={isSubmittingShare}
                      fullWidth
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="secondary"
                      disabled={isSubmittingShare || selectedWorkspace === ""}
                      startIcon={
                        isSubmittingShare ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <ShareRoundedIcon />
                        )
                      }
                      sx={{ alignSelf: "flex-start" }}
                    >
                      {isSubmittingShare ? "Sharing…" : "Share workspace"}
                    </Button>
                  </Stack>
                </Box>

                <Stack spacing={1.25}>
                  <Typography variant="overline" color="text.secondary">
                    Current collaborators
                  </Typography>
                  <Box className="subtle-list">
                    <Chip
                      icon={<PersonRoundedIcon />}
                      label={`${selectedWorkspace} · owner`}
                      sx={{
                        bgcolor: alpha("#16423c", 0.08),
                        color: "text.primary",
                      }}
                    />
                    {collaboratorEmails.length === 0 ? (
                      <Typography color="text.secondary">
                        No collaborators yet. Add someone above to share the queue.
                      </Typography>
                    ) : (
                      collaboratorEmails.map((email) => (
                        <Chip
                          key={email}
                          icon={<GroupRoundedIcon />}
                          label={email}
                          sx={{
                            bgcolor: alpha("#f05d3f", 0.08),
                            color: "text.primary",
                          }}
                        />
                      ))
                    )}
                  </Box>
                </Stack>

                {shareError ? <Alert severity="error">{shareError}</Alert> : null}
                {shareSuccess ? <Alert severity="success">{shareSuccess}</Alert> : null}
              </Stack>
            </Paper>
          </Box>

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
                    Workspace queue
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 1 }}>
                    {selectedWorkspace}
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

              {workspaceError ? <Alert severity="error">{workspaceError}</Alert> : null}

              {isWorkspaceLoading ? (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <CircularProgress size={20} />
                  <Typography>Loading workspace…</Typography>
                </Stack>
              ) : null}

              {!isWorkspaceLoading && !workspaceError ? (
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
                        <Typography variant="h5">
                          No todos in this workspace yet. Add the first item above.
                        </Typography>
                        <Typography color="text.secondary">
                          Ownership is assigned automatically when the task is created.
                        </Typography>
                      </Stack>
                    </Paper>
                  ) : (
                    <Box component="ul" className="todo-list" aria-label="Todo items">
                      {todos.map((todo, index) => {
                        const isComplete = todo.completed;
                        const isUpdating = updatingTodoIds.includes(todo.id);
                        const isDeleting = deletingTodoIds.includes(todo.id);
                        const isMutating = isUpdating || isDeleting;
                        const ownerLabel =
                          todo.ownerEmail === currentUser?.email
                            ? "Owned by you"
                            : `Owned by ${todo.ownerEmail}`;

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
                              opacity: isMutating ? 0.78 : 1,
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
                                    <Stack
                                      direction={{ xs: "column", sm: "row" }}
                                      spacing={{ xs: 0.25, sm: 1 }}
                                      className="todo-meta"
                                    >
                                      <Typography color="text.secondary">
                                        {isComplete
                                          ? "Completed and ready to archive mentally."
                                          : "Open and ready for action."}
                                      </Typography>
                                      <Typography color="text.secondary">{ownerLabel}</Typography>
                                    </Stack>
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
                                    disabled={isMutating}
                                    onClick={() => void handleToggleTodo(todo)}
                                    startIcon={
                                      isUpdating ? (
                                        <CircularProgress size={16} color="inherit" />
                                      ) : isComplete ? (
                                        <CircleRoundedIcon />
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
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    disabled={isMutating}
                                    onClick={() => void handleDeleteTodo(todo)}
                                    startIcon={
                                      isDeleting ? (
                                        <CircularProgress size={16} color="inherit" />
                                      ) : (
                                        <DeleteOutlineRoundedIcon />
                                      )
                                    }
                                    aria-label={`Delete ${todo.title}`}
                                    sx={{ minWidth: 120 }}
                                  >
                                    {isDeleting ? "Deleting…" : "Delete"}
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
