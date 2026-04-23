import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { alpha } from "@mui/material/styles";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  ownerEmail: string;
  workspaceId: string;
};

type TodoListResponse = {
  items: Todo[];
  workspaceId: string;
};

type WorkspaceAccess = {
  id: string;
  name: string;
  description: string;
  ownerEmail: string;
  role: "owner" | "collaborator";
};

type WorkspaceShare = {
  workspaceId: string;
  email: string;
};

type ShareListResponse = {
  items: WorkspaceShare[];
  workspaceId: string;
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
const WORKSPACE_ENDPOINT = "/api/workspaces";
const TODO_ENDPOINT = "/api/todos";
const SHARE_ENDPOINT = "/api/shares";

const UNAUTHENTICATED_SESSION: SessionState = {
  authenticated: false,
  googleLoginEnabled: false,
  googleLoginURL: "",
  accessibleWorkspaces: [],
};
const EMPTY_WORKSPACES: WorkspaceAccess[] = [];

function normalizeWorkspaceAccess(workspace: Partial<WorkspaceAccess>): WorkspaceAccess | null {
  if (typeof workspace.id !== "string" || workspace.id.trim() === "") {
    return null;
  }
  if (typeof workspace.ownerEmail !== "string" || workspace.ownerEmail.trim() === "") {
    return null;
  }

  return {
    id: workspace.id,
    name:
      typeof workspace.name === "string" && workspace.name.trim() !== ""
        ? workspace.name
        : "Untitled workspace",
    description: typeof workspace.description === "string" ? workspace.description : "",
    ownerEmail: workspace.ownerEmail,
    role: workspace.role === "collaborator" ? "collaborator" : "owner",
  };
}

function normalizeSessionState(data: Partial<SessionState>): SessionState {
  return {
    authenticated: data.authenticated === true,
    googleLoginEnabled: data.googleLoginEnabled === true,
    googleLoginURL: data.googleLoginURL ?? "",
    user: data.user,
    accessibleWorkspaces: Array.isArray(data.accessibleWorkspaces)
      ? data.accessibleWorkspaces
          .map((workspace) => normalizeWorkspaceAccess(workspace))
          .filter((workspace): workspace is WorkspaceAccess => workspace !== null)
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

function formatWorkspaceLabel(workspace: WorkspaceAccess) {
  return `${workspace.name} · ${workspace.ownerEmail}`;
}

export function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [shares, setShares] = useState<WorkspaceShare[]>([]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [draftTodoTitle, setDraftTodoTitle] = useState("");

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingPasswordReset, setIsSubmittingPasswordReset] = useState(false);
  const [isCreateWorkspaceDialogOpen, setIsCreateWorkspaceDialogOpen] = useState(false);
  const [isSubmittingWorkspace, setIsSubmittingWorkspace] = useState(false);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [isAddingTodoInline, setIsAddingTodoInline] = useState(false);
  const [viewMode, setViewMode] = useState<"workspace" | "settings">("workspace");
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [updatingTodoIds, setUpdatingTodoIds] = useState<string[]>([]);
  const [deletingTodoIds, setDeletingTodoIds] = useState<string[]>([]);

  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceManageError, setWorkspaceManageError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const currentUser = session?.user;
  const isAuthenticated = session?.authenticated === true;
  const googleLoginEnabled = session?.googleLoginEnabled === true;
  const googleLoginURL = session?.googleLoginURL ?? "";
  const requiresPasswordReset = currentUser?.passwordResetRequired === true;
  const accessibleWorkspaces = session?.accessibleWorkspaces ?? EMPTY_WORKSPACES;
  const currentWorkspace = accessibleWorkspaces.find((workspace) => workspace.id === selectedWorkspace);
  const canManageCurrentWorkspace = currentWorkspace?.role === "owner";
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
      setViewMode("workspace");
      return;
    }

    if (accessibleWorkspaces.length === 0) {
      setSelectedWorkspace("");
      setViewMode("workspace");
      return;
    }

    setSelectedWorkspace((currentWorkspaceId) => {
      if (
        currentWorkspaceId !== "" &&
        accessibleWorkspaces.some((workspace) => workspace.id === currentWorkspaceId)
      ) {
        return currentWorkspaceId;
      }

      return (
        accessibleWorkspaces.find((workspace) => workspace.role === "owner")?.id ??
        accessibleWorkspaces[0].id
      );
    });
  }, [accessibleWorkspaces, isAuthenticated, requiresPasswordReset]);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated || requiresPasswordReset) {
      return () => {
        isMounted = false;
      };
    }

    if (selectedWorkspace === "") {
      setTodos([]);
      setShares([]);
      setIsWorkspaceLoading(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadWorkspaceData() {
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

  function resetWorkspaceComposer() {
    setWorkspaceName("");
    setWorkspaceDescription("");
  }

  function resetTodoComposer() {
    setDraftTodoTitle("");
    setIsAddingTodoInline(false);
  }

  function openCreateWorkspaceDialog() {
    setWorkspaceManageError(null);
    setWorkspaceSuccess(null);
    resetWorkspaceComposer();
    setIsCreateWorkspaceDialogOpen(true);
  }

  function closeCreateWorkspaceDialog() {
    if (isSubmittingWorkspace) {
      return;
    }

    setIsCreateWorkspaceDialogOpen(false);
    resetWorkspaceComposer();
  }

  function handleWorkspaceSelection(event: SelectChangeEvent<string>) {
    setSelectedWorkspace(event.target.value);
    setViewMode("workspace");
    setWorkspaceError(null);
    setShareError(null);
    setShareSuccess(null);
    setTodoError(null);
    resetTodoComposer();
  }

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
    setShares([]);
    setTodos([]);
    setWorkspaceManageError(null);
    setWorkspaceSuccess(null);
    setShareSuccess(null);
    setViewMode("workspace");
    resetWorkspaceComposer();
    resetTodoComposer();
    setUpdatingTodoIds([]);
    setDeletingTodoIds([]);
    setDeletingWorkspaceId(null);
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = workspaceName.trim();
    if (trimmedName === "") {
      setWorkspaceManageError("Workspace name is required.");
      return;
    }

    setIsSubmittingWorkspace(true);
    setWorkspaceManageError(null);
    setWorkspaceSuccess(null);

    try {
      const response = await fetch(WORKSPACE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: workspaceDescription.trim(),
        }),
      });

      if (response.status === 401) {
        setSession(UNAUTHENTICATED_SESSION);
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to create the workspace."));
      }

      const createdWorkspace = normalizeWorkspaceAccess(
        (await response.json()) as WorkspaceAccess,
      );
      if (!createdWorkspace) {
        throw new Error("Workspace response was incomplete.");
      }

      setSession((currentSession) =>
        currentSession
          ? normalizeSessionState({
              ...currentSession,
              accessibleWorkspaces: [
                ...(currentSession.accessibleWorkspaces ?? []),
                createdWorkspace,
              ],
            })
          : currentSession,
      );
      setSelectedWorkspace(createdWorkspace.id);
      setViewMode("workspace");
      closeCreateWorkspaceDialog();
      setWorkspaceSuccess(`Created ${createdWorkspace.name}.`);
    } catch (error) {
      setWorkspaceManageError(
        error instanceof Error ? error.message : "Unable to create the workspace.",
      );
    } finally {
      setIsSubmittingWorkspace(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (!currentWorkspace) {
      return;
    }

    setDeletingWorkspaceId(currentWorkspace.id);
    setWorkspaceManageError(null);
    setWorkspaceSuccess(null);

    try {
      const response = await fetch(`${WORKSPACE_ENDPOINT}/${currentWorkspace.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        setSession(UNAUTHENTICATED_SESSION);
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to delete the workspace."));
      }

      setSession((currentSession) =>
        currentSession
          ? normalizeSessionState({
              ...currentSession,
              accessibleWorkspaces: (currentSession.accessibleWorkspaces ?? []).filter(
                (workspace) => workspace.id !== currentWorkspace.id,
              ),
            })
          : currentSession,
      );
      setSelectedWorkspace("");
      setTodos([]);
      setShares([]);
      setViewMode("workspace");
      setWorkspaceSuccess(`Deleted ${currentWorkspace.name}.`);
    } catch (error) {
      setWorkspaceManageError(
        error instanceof Error ? error.message : "Unable to delete the workspace.",
      );
    } finally {
      setDeletingWorkspaceId(null);
    }
  }

  function startInlineTodoComposer() {
    if (!currentWorkspace) {
      return;
    }

    setTodoError(null);
    setDraftTodoTitle("");
    setIsAddingTodoInline(true);
  }

  function cancelInlineTodoComposer() {
    setTodoError(null);
    resetTodoComposer();
  }

  async function handleSubmitTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = draftTodoTitle.trim();
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
          workspaceId: selectedWorkspace,
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
      resetTodoComposer();
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
          workspaceId: selectedWorkspace,
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
              sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: "20px", md: "24px" } }}
            >
              <Stack spacing={2}>
                <Chip
                  icon={<VpnKeyRoundedIcon />}
                  label="Workspace access"
                  sx={{
                    alignSelf: "flex-start",
                    bgcolor: alpha("#16423c", 0.08),
                    color: "text.primary",
                  }}
                />
                <Typography variant="h3">{title}</Typography>
                <Typography color="text.secondary">{subtitle}</Typography>
                {helper}
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              className="soft-panel auth-panel"
              sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
            >
              {content}
            </Paper>
          </Stack>
        </Container>
      </Box>
    );
  }

  function renderWorkspaceView() {
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
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
            >
              <Box>
                <Typography variant="h6">Collaborators</Typography>
                <Typography color="text.secondary">
                  Everyone listed here can work inside this workspace.
                </Typography>
              </Box>
            </Stack>

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

            <Box component="form" onSubmit={handleShareWorkspace} aria-label="Share workspace">
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{ alignItems: { md: "flex-start" } }}
              >
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
                  color="primary"
                  disabled={isSubmittingShare || selectedWorkspace === ""}
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

        <Paper
          elevation={0}
          className="soft-panel workspace-panel"
          sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
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
                  {remainingCount} open, {completedCount} completed.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<AddRoundedIcon />}
                onClick={startInlineTodoComposer}
                disabled={isAddingTodoInline || selectedWorkspace === ""}
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
                        onClick={cancelInlineTodoComposer}
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
                <Typography>Loading workspace...</Typography>
              </Stack>
            ) : null}

            {!isWorkspaceLoading && workspaceError ? (
              <Alert severity="error">{workspaceError}</Alert>
            ) : null}

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
                    todo.ownerEmail === currentUser?.email
                      ? "Owned by you"
                      : `Owned by ${todo.ownerEmail}`;

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
                          <Typography color="text.secondary">{ownerLabel}</Typography>
                        </Box>

                        <Stack direction="row" spacing={1} className="todo-actions">
                          <Button
                            variant={todo.completed ? "outlined" : "contained"}
                            color={todo.completed ? "inherit" : "success"}
                            disabled={isMutating}
                            onClick={() => void handleToggleTodo(todo)}
                          >
                            {isUpdating
                              ? "Saving..."
                              : todo.completed
                              ? "Reopen"
                              : "Mark done"}
                          </Button>
                          <Button
                            variant="text"
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
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Box>
            ) : null}
          </Stack>
        </Paper>
      </Stack>
    );
  }

  function renderSettingsView() {
    if (!currentWorkspace) {
      return (
        <Paper
          elevation={0}
          className="soft-panel workspace-panel"
          sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
        >
          <Typography color="text.secondary">Select a workspace to view settings.</Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        className="soft-panel workspace-panel"
        sx={{ p: { xs: 3, md: 3.5 }, borderRadius: { xs: "18px", md: "22px" } }}
      >
        <Stack spacing={3}>
          <Button
            variant="text"
            color="inherit"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => setViewMode("workspace")}
            sx={{ alignSelf: "flex-start" }}
          >
            Back
          </Button>

          <Box>
            <Typography variant="h5">Workspace settings</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {formatWorkspaceLabel(currentWorkspace)}
            </Typography>
          </Box>

          <Stack spacing={1.5}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Name
              </Typography>
              <Typography>{currentWorkspace.name}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Description
              </Typography>
              <Typography>{currentWorkspace.description || "No description."}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Owner
              </Typography>
              <Typography>{currentWorkspace.ownerEmail}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Access
              </Typography>
              <Typography>{currentWorkspace.role}</Typography>
            </Box>
          </Stack>

          <Paper elevation={0} className="danger-panel">
            <Stack spacing={1.5}>
              <Typography variant="h6">Delete workspace</Typography>
              <Typography color="text.secondary">
                This removes the workspace, its collaborators, and all todos inside it.
              </Typography>
              {canManageCurrentWorkspace ? (
                <Button
                  variant="contained"
                  color="error"
                  disabled={deletingWorkspaceId === currentWorkspace.id}
                  onClick={() => void handleDeleteWorkspace()}
                  startIcon={
                    deletingWorkspaceId === currentWorkspace.id ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <DeleteOutlineRoundedIcon />
                    )
                  }
                  sx={{ alignSelf: "flex-start" }}
                >
                  {deletingWorkspaceId === currentWorkspace.id
                    ? "Deleting..."
                    : "Delete workspace"}
                </Button>
              ) : (
                <Typography color="text.secondary">
                  Only the owner can delete this workspace.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Paper>
    );
  }

  if (isInitializing) {
    return renderAuthShell(
      "Loading",
      "Checking for an existing session.",
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <CircularProgress size={20} />
        <Typography>Loading session...</Typography>
      </Stack>,
      sessionError ? <Alert severity="error">{sessionError}</Alert> : undefined,
    );
  }

  if (!isAuthenticated) {
    return renderAuthShell(
      "Sign in",
      "Use the credentials provisioned for your account.",
      <Stack spacing={3}>
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
              Google login works only when the verified Google account exactly matches an
              existing user in this app.
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
              {isSubmittingLogin ? "Logging in..." : "Log in"}
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
      "Set password",
      "Finish setup before using workspace apps.",
      <Stack spacing={3}>
        <Typography>{currentUser?.email}</Typography>

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
                {isSubmittingPasswordReset ? "Saving..." : "Save password"}
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
    <Box component="main" className="app-shell" sx={{ py: { xs: 3, md: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={2.5}>
          <Paper
            elevation={0}
            className="page-header"
            sx={{ p: { xs: 2, md: 2.5 }, borderRadius: { xs: "18px", md: "22px" } }}
          >
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2}
              sx={{ justifyContent: "space-between", alignItems: { lg: "center" } }}
            >
              <Box>
                <Typography variant="h5">Workspaces</Typography>
                <Typography color="text.secondary">{currentUser?.email}</Typography>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ alignItems: { sm: "center" }, width: { xs: "100%", lg: "auto" } }}
              >
                <FormControl size="small" className="workspace-select">
                  <InputLabel id="workspace-select-label">Workspace</InputLabel>
                  <Select
                    labelId="workspace-select-label"
                    value={selectedWorkspace}
                    label="Workspace"
                    onChange={handleWorkspaceSelection}
                    displayEmpty
                    renderValue={() =>
                      currentWorkspace ? formatWorkspaceLabel(currentWorkspace) : "Select workspace"
                    }
                  >
                    {accessibleWorkspaces.map((workspace) => (
                      <MenuItem key={workspace.id} value={workspace.id}>
                        {formatWorkspaceLabel(workspace)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <IconButton
                  color="primary"
                  aria-label="Create workspace"
                  onClick={openCreateWorkspaceDialog}
                >
                  <AddRoundedIcon />
                </IconButton>

                <Button
                  variant={viewMode === "settings" ? "contained" : "outlined"}
                  color="inherit"
                  startIcon={<SettingsRoundedIcon />}
                  disabled={!currentWorkspace}
                  onClick={() => setViewMode(viewMode === "settings" ? "workspace" : "settings")}
                >
                  {viewMode === "settings" ? "Back to workspace" : "Workspace settings"}
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => void handleLogout()}
                  startIcon={<LogoutRoundedIcon />}
                >
                  Log out
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {workspaceManageError ? <Alert severity="error">{workspaceManageError}</Alert> : null}
          {workspaceSuccess ? <Alert severity="success">{workspaceSuccess}</Alert> : null}

          {viewMode === "settings" ? renderSettingsView() : renderWorkspaceView()}
        </Stack>
      </Container>

      <Dialog open={isCreateWorkspaceDialogOpen} onClose={closeCreateWorkspaceDialog} fullWidth>
        <Box component="form" onSubmit={handleCreateWorkspace}>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Workspace name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                disabled={isSubmittingWorkspace}
                fullWidth
              />
              <TextField
                label="Description"
                value={workspaceDescription}
                onChange={(event) => setWorkspaceDescription(event.target.value)}
                disabled={isSubmittingWorkspace}
                multiline
                minRows={3}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={closeCreateWorkspaceDialog} color="inherit" disabled={isSubmittingWorkspace}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmittingWorkspace}
              startIcon={
                isSubmittingWorkspace ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AddRoundedIcon />
                )
              }
            >
              {isSubmittingWorkspace ? "Creating..." : "Create workspace"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

export default App;
