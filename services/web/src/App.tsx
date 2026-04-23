import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";

import {
  LOGIN_ENDPOINT,
  LOGOUT_ENDPOINT,
  RESET_PASSWORD_ENDPOINT,
  SESSION_ENDPOINT,
  SHARE_ENDPOINT,
  TODO_ENDPOINT,
  WORKSPACE_ENDPOINT,
  readErrorMessage,
} from "./app/api";
import { authErrorMessage, normalizeSessionState, normalizeWorkspaceAccess } from "./app/session";
import {
  EMPTY_WORKSPACES,
  SessionState,
  ShareListResponse,
  Todo,
  TodoListResponse,
  UNAUTHENTICATED_SESSION,
  WorkspaceAccess,
  WorkspaceShare,
} from "./app/types";
import { AuthShell } from "./features/auth/AuthShell";
import { LoginView } from "./features/auth/LoginView";
import { PasswordSetupView } from "./features/auth/PasswordSetupView";
import { CreateWorkspacePopover } from "./features/workspaces/CreateWorkspacePopover";
import { WorkspaceHeader } from "./features/workspaces/WorkspaceHeader";
import { WorkspaceRail } from "./features/workspaces/WorkspaceRail";
import { WorkspaceSettingsView } from "./features/workspaces/WorkspaceSettingsView";
import { WorkspaceView } from "./features/workspaces/WorkspaceView";

function readInitialAuthError() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("authError");

  return code ? authErrorMessage(code) : null;
}

function resetTransientWorkspaceState() {
  return {
    todos: [] as Todo[],
    shares: [] as WorkspaceShare[],
    workspaceError: null as string | null,
    shareError: null as string | null,
    shareSuccess: null as string | null,
    todoError: null as string | null,
    isAddingTodoInline: false,
    draftTodoTitle: "",
  };
}

export default function App() {
  const [sessionState, setSessionState] = useState<SessionState>(UNAUTHENTICATED_SESSION);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSubmittingPasswordReset, setIsSubmittingPasswordReset] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(false);
  const [isMobileAppDrawerOpen, setIsMobileAppDrawerOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [shares, setShares] = useState<WorkspaceShare[]>([]);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [collaboratorMenuAnchorEl, setCollaboratorMenuAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [removingCollaboratorEmails, setRemovingCollaboratorEmails] = useState<string[]>([]);
  const [draftTodoTitle, setDraftTodoTitle] = useState("");
  const [isAddingTodoInline, setIsAddingTodoInline] = useState(false);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
  const [updatingTodoIds, setUpdatingTodoIds] = useState<string[]>([]);
  const [deletingTodoIds, setDeletingTodoIds] = useState<string[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [createWorkspaceAnchorEl, setCreateWorkspaceAnchorEl] = useState<HTMLElement | null>(null);
  const [isSubmittingWorkspace, setIsSubmittingWorkspace] = useState(false);
  const [createWorkspaceError, setCreateWorkspaceError] = useState<string | null>(null);
  const [workspaceManageError, setWorkspaceManageError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [initialAuthError] = useState(() => readInitialAuthError());

  const accessibleWorkspaces = sessionState.accessibleWorkspaces ?? EMPTY_WORKSPACES;

  const currentWorkspace = useMemo(
    () => accessibleWorkspaces.find((workspace) => workspace.id === selectedWorkspaceId),
    [accessibleWorkspaces, selectedWorkspaceId],
  );

  const collaboratorEmails = useMemo(
    () =>
      Array.from(new Set(shares.map((share) => share.email)))
        .filter((email) => email !== currentWorkspace?.ownerEmail)
        .sort((left, right) => left.localeCompare(right)),
    [currentWorkspace?.ownerEmail, shares],
  );

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  );
  const completedCount = todos.length - remainingCount;
  const canManageCurrentWorkspace = currentWorkspace?.role === "owner";

  useEffect(() => {
    if (!initialAuthError || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("authError");
    window.history.replaceState({}, document.title, url.toString());
  }, [initialAuthError]);

  function applySessionState(nextSession: SessionState) {
    setSessionState(nextSession);
    setIsWorkspaceSettingsOpen(false);
    setCreateWorkspaceAnchorEl(null);
    setCreateWorkspaceError(null);

    if (nextSession.authenticated) {
      setLoginError(null);
      return;
    }

    const clearedState = resetTransientWorkspaceState();
    setTodos(clearedState.todos);
    setShares(clearedState.shares);
    setWorkspaceError(clearedState.workspaceError);
    setShareError(clearedState.shareError);
    setShareSuccess(clearedState.shareSuccess);
    setTodoError(clearedState.todoError);
    setIsAddingTodoInline(clearedState.isAddingTodoInline);
    setDraftTodoTitle(clearedState.draftTodoTitle);
    setIsDesktopSidebarExpanded(false);
    setIsMobileAppDrawerOpen(false);
    setShareEmail("");
    setCollaboratorMenuAnchorEl(null);
    setRemovingCollaboratorEmails([]);
    setWorkspaceSuccess(null);
    setWorkspaceManageError(null);
    setDeletingWorkspaceId(null);
    setSelectedWorkspaceId("");
    setLoginError(initialAuthError);
  }

  async function loadSession() {
    const response = await fetch(SESSION_ENDPOINT);
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to load the current session."));
    }

    const data = normalizeSessionState((await response.json()) as Partial<SessionState>);
    applySessionState(data);
    return data;
  }

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const nextSession = await loadSession();
        if (!isActive) {
          return;
        }
        if (!nextSession.authenticated && !initialAuthError) {
          setLoginError(null);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        setSessionState(UNAUTHENTICATED_SESSION);
        setLoginError(error instanceof Error ? error.message : "Unable to load the current session.");
      } finally {
        if (isActive) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [initialAuthError]);

  useEffect(() => {
    if (accessibleWorkspaces.length === 0) {
      if (selectedWorkspaceId !== "") {
        setSelectedWorkspaceId("");
      }
      return;
    }

    if (!accessibleWorkspaces.some((workspace) => workspace.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(accessibleWorkspaces[0].id);
    }
  }, [accessibleWorkspaces, selectedWorkspaceId]);

  useEffect(() => {
    if (!sessionState.authenticated || sessionState.user?.passwordResetRequired || !selectedWorkspaceId) {
      setTodos([]);
      setShares([]);
      setIsWorkspaceLoading(false);
      setWorkspaceError(null);
      return;
    }

    let isActive = true;

    void (async () => {
      setIsWorkspaceLoading(true);
      setWorkspaceError(null);

      try {
        const [todoResponse, shareResponse] = await Promise.all([
          fetch(`${TODO_ENDPOINT}?workspace=${encodeURIComponent(selectedWorkspaceId)}`),
          fetch(`${SHARE_ENDPOINT}?workspace=${encodeURIComponent(selectedWorkspaceId)}`),
        ]);

        if (!todoResponse.ok) {
          throw new Error(await readErrorMessage(todoResponse, "Unable to load todos."));
        }
        if (!shareResponse.ok) {
          throw new Error(await readErrorMessage(shareResponse, "Unable to load collaborators."));
        }

        const todoData = (await todoResponse.json()) as Partial<TodoListResponse>;
        const shareData = (await shareResponse.json()) as Partial<ShareListResponse>;

        if (!isActive) {
          return;
        }

        setTodos(Array.isArray(todoData.items) ? todoData.items : []);
        setShares(Array.isArray(shareData.items) ? shareData.items : []);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setWorkspaceError(error instanceof Error ? error.message : "Unable to load workspace data.");
        setTodos([]);
        setShares([]);
      } finally {
        if (isActive) {
          setIsWorkspaceLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [selectedWorkspaceId, sessionState.authenticated, sessionState.user?.passwordResetRequired]);

  function handleWorkspaceChange(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    setIsWorkspaceSettingsOpen(false);
    setWorkspaceError(null);
    setShareEmail("");
    setShareError(null);
    setShareSuccess(null);
    setCollaboratorMenuAnchorEl(null);
    setRemovingCollaboratorEmails([]);
    setTodoError(null);
    setDraftTodoTitle("");
    setIsAddingTodoInline(false);
    setCreateWorkspaceAnchorEl(null);
    setCreateWorkspaceError(null);
    setWorkspaceManageError(null);
  }

  function handleOpenCreateWorkspace(event: MouseEvent<HTMLElement>) {
    setCollaboratorMenuAnchorEl(null);
    setShareError(null);
    setShareSuccess(null);
    setCreateWorkspaceError(null);
    setWorkspaceManageError(null);
    setWorkspaceSuccess(null);
    resetCreateWorkspaceForm();
    setCreateWorkspaceAnchorEl(event.currentTarget);
  }

  function handleCloseCreateWorkspace() {
    if (isSubmittingWorkspace) {
      return;
    }

    setCreateWorkspaceAnchorEl(null);
    setCreateWorkspaceError(null);
    resetCreateWorkspaceForm();
  }

  function resetCreateWorkspaceForm() {
    setWorkspaceName("");
    setWorkspaceDescription("");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingLogin(true);
    setLoginError(null);

    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to log in."));
      }

      const nextSession = normalizeSessionState((await response.json()) as Partial<SessionState>);
      applySessionState(nextSession);
      setLoginPassword("");
      setResetError(null);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to log in.");
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingPasswordReset(true);
    setResetError(null);

    try {
      const response = await fetch(RESET_PASSWORD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: resetNewPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to save password."));
      }

      const nextSession = normalizeSessionState((await response.json()) as Partial<SessionState>);
      applySessionState(nextSession);
      setResetNewPassword("");
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Unable to save password.");
    } finally {
      setIsSubmittingPasswordReset(false);
    }
  }

  async function handleLogout() {
    setLoginError(null);
    setResetError(null);
    setWorkspaceManageError(null);
    setWorkspaceSuccess(null);
    setCollaboratorMenuAnchorEl(null);
    setCreateWorkspaceAnchorEl(null);
    setCreateWorkspaceError(null);
    setRemovingCollaboratorEmails([]);
    setShareError(null);
    setShareSuccess(null);
    setShareEmail("");
    setTodoError(null);

    try {
      await fetch(LOGOUT_ENDPOINT, { method: "POST" });
    } finally {
      setLoginPassword("");
      setResetNewPassword("");
      setIsWorkspaceSettingsOpen(false);
      await loadSession().catch((error) => {
        setSessionState(UNAUTHENTICATED_SESSION);
        setLoginError(error instanceof Error ? error.message : "Unable to load the current session.");
      });
    }
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = workspaceName.trim();
    const trimmedDescription = workspaceDescription.trim();

    if (trimmedName === "") {
      setCreateWorkspaceError("Workspace name is required.");
      return;
    }

    setIsSubmittingWorkspace(true);
    setCreateWorkspaceError(null);
    setWorkspaceSuccess(null);

    try {
      const response = await fetch(WORKSPACE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to create workspace."));
      }

      const createdWorkspace = normalizeWorkspaceAccess(
        (await response.json()) as Partial<WorkspaceAccess>,
      );

      if (!createdWorkspace) {
        throw new Error("Workspace response was incomplete.");
      }

      setSessionState((current) => ({
        ...current,
        accessibleWorkspaces: [...(current.accessibleWorkspaces ?? []), createdWorkspace],
      }));
      setSelectedWorkspaceId(createdWorkspace.id);
      setIsWorkspaceSettingsOpen(false);
      setWorkspaceSuccess(`Created ${createdWorkspace.name}.`);
      setCreateWorkspaceAnchorEl(null);
      resetCreateWorkspaceForm();
    } catch (error) {
      setCreateWorkspaceError(
        error instanceof Error ? error.message : "Unable to create workspace.",
      );
    } finally {
      setIsSubmittingWorkspace(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (!currentWorkspace || !canManageCurrentWorkspace) {
      return;
    }

    setDeletingWorkspaceId(currentWorkspace.id);
    setWorkspaceManageError(null);
    setWorkspaceSuccess(null);
    setCreateWorkspaceAnchorEl(null);
    setCreateWorkspaceError(null);

    try {
      const response = await fetch(`${WORKSPACE_ENDPOINT}/${currentWorkspace.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to delete workspace."));
      }

      const deletedWorkspace = currentWorkspace;
      const nextWorkspaces = accessibleWorkspaces.filter(
        (workspace) => workspace.id !== deletedWorkspace.id,
      );

      setSessionState((current) => ({
        ...current,
        accessibleWorkspaces: nextWorkspaces,
      }));
      setSelectedWorkspaceId(nextWorkspaces[0]?.id ?? "");
      setIsWorkspaceSettingsOpen(false);
      setWorkspaceSuccess(`Deleted ${deletedWorkspace.name}.`);
      setCollaboratorMenuAnchorEl(null);
      setRemovingCollaboratorEmails([]);
      setShareEmail("");
      setTodos([]);
      setShares([]);
    } catch (error) {
      setWorkspaceManageError(
        error instanceof Error ? error.message : "Unable to delete workspace.",
      );
    } finally {
      setDeletingWorkspaceId(null);
    }
  }

  async function handleShareWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentWorkspace) {
      return;
    }

    setIsSubmittingShare(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const response = await fetch(SHARE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          email: shareEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to add collaborator."));
      }

      const share = (await response.json()) as WorkspaceShare;

      setShares((current) => {
        if (
          current.some(
            (existingShare) =>
              existingShare.workspaceId === share.workspaceId && existingShare.email === share.email,
          )
        ) {
          return current;
        }

        return [...current, share];
      });
      setShareEmail("");
      setShareSuccess(`Shared with ${share.email}.`);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Unable to add collaborator.");
    } finally {
      setIsSubmittingShare(false);
    }
  }

  async function handleRemoveCollaborator(email: string) {
    if (!currentWorkspace) {
      return;
    }

    setRemovingCollaboratorEmails((current) => [...current, email]);
    setShareError(null);
    setShareSuccess(null);

    try {
      const response = await fetch(SHARE_ENDPOINT, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to remove collaborator."));
      }

      setShares((current) => current.filter((share) => share.email !== email));
      setShareSuccess(`Removed ${email}.`);

      if (email === sessionState.user?.email && currentWorkspace.role === "collaborator") {
        const nextWorkspaces = accessibleWorkspaces.filter(
          (workspace) => workspace.id !== currentWorkspace.id,
        );
        setSessionState((current) => ({
          ...current,
          accessibleWorkspaces: nextWorkspaces,
        }));
        setSelectedWorkspaceId(nextWorkspaces[0]?.id ?? "");
        setCollaboratorMenuAnchorEl(null);
        setShares([]);
        setTodos([]);
      }
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Unable to remove collaborator.");
    } finally {
      setRemovingCollaboratorEmails((current) => current.filter((value) => value !== email));
    }
  }

  function handleOpenCollaborators(event: MouseEvent<HTMLElement>) {
    setShareError(null);
    setShareSuccess(null);
    setCreateWorkspaceAnchorEl(null);
    setCreateWorkspaceError(null);
    setCollaboratorMenuAnchorEl(event.currentTarget);
  }

  function handleCloseCollaborators() {
    setCollaboratorMenuAnchorEl(null);
  }

  async function handleSubmitTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentWorkspace) {
      return;
    }

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
          workspaceId: currentWorkspace.id,
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

  if (isBootstrapping) {
    return (
      <Box component="main" className="app-shell" sx={{ py: { xs: 4, md: 6 } }}>
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            className="soft-panel auth-panel"
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: { xs: "var(--surface-radius)", md: "var(--surface-radius-lg)" },
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <CircularProgress size={20} />
              <Typography>Loading session...</Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!sessionState.authenticated) {
    return (
      <AuthShell
        title="Log in"
        subtitle="Use your existing account to enter the workspace app."
        content={
          <LoginView
            googleLoginEnabled={sessionState.googleLoginEnabled === true}
            googleLoginURL={sessionState.googleLoginURL ?? ""}
            loginEmail={loginEmail}
            loginPassword={loginPassword}
            isSubmittingLogin={isSubmittingLogin}
            loginError={loginError}
            onSubmit={handleLogin}
            onEmailChange={setLoginEmail}
            onPasswordChange={setLoginPassword}
          />
        }
      />
    );
  }

  if (sessionState.user?.passwordResetRequired) {
    return (
      <AuthShell
        title="Set password"
        subtitle="Choose a password to finish setup."
        content={
          <PasswordSetupView
            email={sessionState.user.email}
            resetNewPassword={resetNewPassword}
            isSubmittingPasswordReset={isSubmittingPasswordReset}
            resetError={resetError}
            onSubmit={handlePasswordReset}
            onPasswordChange={setResetNewPassword}
            onLogout={handleLogout}
          />
        }
      />
    );
  }

  return (
    <Box component="main" className="app-shell app-shell-auth">
      <Box className="workspace-shell">
        <Box className="workspace-rail-shell">
          <WorkspaceRail
            currentUserEmail={sessionState.user?.email}
            accessibleWorkspaces={accessibleWorkspaces}
            selectedWorkspace={selectedWorkspaceId}
            currentWorkspace={currentWorkspace}
            collaboratorCount={collaboratorEmails.length}
            collaboratorMenuAnchorEl={collaboratorMenuAnchorEl}
            isCollaboratorMenuOpen={Boolean(collaboratorMenuAnchorEl)}
            collaboratorEmails={collaboratorEmails}
            shareEmail={shareEmail}
            isSubmittingShare={isSubmittingShare}
            shareError={shareError}
            shareSuccess={shareSuccess}
            removingCollaboratorEmails={removingCollaboratorEmails}
            isWorkspaceSettingsOpen={isWorkspaceSettingsOpen}
            isSidebarExpanded={isDesktopSidebarExpanded}
            onWorkspaceChange={handleWorkspaceChange}
            onOpenCreateWorkspace={handleOpenCreateWorkspace}
            onOpenCollaborators={handleOpenCollaborators}
            onCloseCollaborators={handleCloseCollaborators}
            onShareEmailChange={setShareEmail}
            onShareWorkspace={handleShareWorkspace}
            onRemoveCollaborator={handleRemoveCollaborator}
            onToggleSidebar={() => setIsDesktopSidebarExpanded((current) => !current)}
            onToggleSettings={() => setIsWorkspaceSettingsOpen((current) => !current)}
            onLogout={handleLogout}
          />
        </Box>

        <Box className="workspace-header-shell">
          <WorkspaceHeader
            currentUserEmail={sessionState.user?.email}
            accessibleWorkspaces={accessibleWorkspaces}
            selectedWorkspace={selectedWorkspaceId}
            currentWorkspace={currentWorkspace}
            collaboratorCount={collaboratorEmails.length}
            collaboratorMenuAnchorEl={collaboratorMenuAnchorEl}
            isCollaboratorMenuOpen={Boolean(collaboratorMenuAnchorEl)}
            collaboratorEmails={collaboratorEmails}
            shareEmail={shareEmail}
            isSubmittingShare={isSubmittingShare}
            shareError={shareError}
            shareSuccess={shareSuccess}
            removingCollaboratorEmails={removingCollaboratorEmails}
            isWorkspaceSettingsOpen={isWorkspaceSettingsOpen}
            isSidebarExpanded={isMobileAppDrawerOpen}
            onWorkspaceChange={handleWorkspaceChange}
            onOpenCreateWorkspace={handleOpenCreateWorkspace}
            onOpenCollaborators={handleOpenCollaborators}
            onCloseCollaborators={handleCloseCollaborators}
            onShareEmailChange={setShareEmail}
            onShareWorkspace={handleShareWorkspace}
            onRemoveCollaborator={handleRemoveCollaborator}
            onToggleSidebar={() => setIsMobileAppDrawerOpen((current) => !current)}
            onToggleSettings={() => setIsWorkspaceSettingsOpen((current) => !current)}
            onLogout={handleLogout}
          />
        </Box>

        <Box className="workspace-body-shell">
          <Box className="workspace-body-container">
            <Stack spacing={2.5} className="workspace-body-stack">
              {workspaceManageError ? <Alert severity="error">{workspaceManageError}</Alert> : null}
              {workspaceSuccess ? <Alert severity="success">{workspaceSuccess}</Alert> : null}

              <Box className="workspace-screen">
                <WorkspaceView
                  currentWorkspace={currentWorkspace}
                  currentUserEmail={sessionState.user?.email}
                  isSidebarExpanded={isMobileAppDrawerOpen}
                  onCloseSidebar={() => setIsMobileAppDrawerOpen(false)}
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
                  onStartInlineTodo={() => {
                    setIsAddingTodoInline(true);
                    setTodoError(null);
                  }}
                  onDraftTodoTitleChange={setDraftTodoTitle}
                  onSubmitTodo={handleSubmitTodo}
                  onCancelInlineTodo={() => {
                    if (isSubmittingTodo) {
                      return;
                    }
                    setDraftTodoTitle("");
                    setTodoError(null);
                    setIsAddingTodoInline(false);
                  }}
                  onToggleTodo={handleToggleTodo}
                  onDeleteTodo={handleDeleteTodo}
                />
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      <WorkspaceSettingsView
        open={isWorkspaceSettingsOpen}
        currentWorkspace={currentWorkspace}
        canManageCurrentWorkspace={canManageCurrentWorkspace}
        deletingWorkspaceId={deletingWorkspaceId}
        onClose={() => setIsWorkspaceSettingsOpen(false)}
        onDeleteWorkspace={handleDeleteWorkspace}
      />

      <CreateWorkspacePopover
        anchorEl={createWorkspaceAnchorEl}
        open={Boolean(createWorkspaceAnchorEl)}
        workspaceName={workspaceName}
        workspaceDescription={workspaceDescription}
        isSubmittingWorkspace={isSubmittingWorkspace}
        createWorkspaceError={createWorkspaceError}
        onClose={handleCloseCreateWorkspace}
        onSubmit={handleCreateWorkspace}
        onNameChange={setWorkspaceName}
        onDescriptionChange={setWorkspaceDescription}
      />
    </Box>
  );
}
