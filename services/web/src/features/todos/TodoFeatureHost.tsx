import { Component, lazy, ReactNode, Suspense } from "react";
import { Alert, CircularProgress, Paper, Stack, Typography } from "@mui/material";

type TodoFeatureProps = {
  workspaceId: string;
  workspaceName: string;
  currentUserEmail?: string;
};

const RemoteTodoFeature = lazy(() => import("todoApp/TodoFeature"));

class TodoFeatureErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMessage: string | null }
> {
  override state = {
    hasError: false,
    errorMessage: null as string | null,
  };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : "Unable to load the todo app.",
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Paper
          elevation={0}
          className="soft-panel workspace-panel"
          sx={{
            p: { xs: 3, md: 3.5 },
            borderRadius: { xs: "var(--surface-radius)", md: "var(--surface-radius-lg)" },
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="h6">Todo app unavailable</Typography>
            <Alert severity="error">
              {this.state.errorMessage ?? "Unable to load the todo app."}
            </Alert>
          </Stack>
        </Paper>
      );
    }

    return this.props.children;
  }
}

function TodoFeatureLoadingState() {
  return (
    <Paper
      elevation={0}
      className="soft-panel workspace-panel"
      sx={{
        p: { xs: 3, md: 3.5 },
        borderRadius: { xs: "var(--surface-radius)", md: "var(--surface-radius-lg)" },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <CircularProgress size={20} />
        <Typography>Loading todo app...</Typography>
      </Stack>
    </Paper>
  );
}

export function TodoFeatureHost(props: TodoFeatureProps) {
  return (
    <TodoFeatureErrorBoundary>
      <Suspense fallback={<TodoFeatureLoadingState />}>
        <RemoteTodoFeature {...props} />
      </Suspense>
    </TodoFeatureErrorBoundary>
  );
}
