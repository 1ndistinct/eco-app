export type ApiError = {
  error?: string;
};

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
  items: Todo[];
  workspaceId: string;
};

export type TodoFeatureProps = {
  workspaceId: string;
  workspaceName: string;
  currentUserEmail?: string;
};
