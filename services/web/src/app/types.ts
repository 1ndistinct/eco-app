export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  ownerEmail: string;
  workspaceId: string;
  createdAt?: string;
  editedAt?: string;
};

export type TodoListResponse = {
  todoItems: Todo[];
  doneItems: Todo[];
  workspaceId: string;
};

export type WorkspaceAccess = {
  id: string;
  name: string;
  description: string;
  ownerEmail: string;
  role: "owner" | "collaborator";
};

export type WorkspaceShare = {
  workspaceId: string;
  email: string;
};

export type ShareListResponse = {
  items: WorkspaceShare[];
  workspaceId: string;
};

export type SessionUser = {
  email: string;
  passwordResetRequired: boolean;
};

export type SessionState = {
  authenticated: boolean;
  googleLoginEnabled?: boolean;
  googleLoginURL?: string;
  user?: SessionUser;
  accessibleWorkspaces?: WorkspaceAccess[];
};

export type ApiError = {
  error?: string;
};

export const UNAUTHENTICATED_SESSION: SessionState = {
  authenticated: false,
  googleLoginEnabled: false,
  googleLoginURL: "",
  accessibleWorkspaces: [],
};

export const EMPTY_WORKSPACES: WorkspaceAccess[] = [];
