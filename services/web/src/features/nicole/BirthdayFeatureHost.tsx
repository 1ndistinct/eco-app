import { Component, lazy, ReactNode, Suspense, useEffect } from "react";
import { Alert, CircularProgress, Paper, Stack, Typography } from "@mui/material";

type BirthdayFeatureProps = {
  workspaceId: string;
  workspaceName: string;
  currentUserEmail?: string;
};

const RemoteBirthdayFeature = lazy(() => import("nicoleApp/BirthdayFeature"));
const NICOLE_REMOTE_ENTRY_URL = "/nicole/remoteEntry.js";
const NICOLE_REMOTE_POLL_INTERVAL_MS = 5_000;

type BirthdayFeatureUnavailableStateProps = {
  errorMessage: string;
  onRecovered?: () => void;
  pollUrl?: string;
  retryIntervalMs?: number;
};

function BirthdayFeatureUnavailableState({
  errorMessage,
  onRecovered,
  pollUrl = NICOLE_REMOTE_ENTRY_URL,
  retryIntervalMs = NICOLE_REMOTE_POLL_INTERVAL_MS,
}: BirthdayFeatureUnavailableStateProps) {
  useEffect(() => {
    let isActive = true;

    const checkRemote = async () => {
      try {
        const cacheBustedPollUrl = pollUrl.includes("?")
          ? `${pollUrl}&t=${Date.now()}`
          : `${pollUrl}?t=${Date.now()}`;
        const response = await fetch(cacheBustedPollUrl, {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (isActive && response.ok) {
          onRecovered?.();
        }
      } catch {
        // Keep polling until the remote is reachable again.
      }
    };

    void checkRemote();
    const intervalId = window.setInterval(() => {
      void checkRemote();
    }, retryIntervalMs);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [onRecovered, pollUrl, retryIntervalMs]);

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
        <Typography variant="h6">Nicole app unavailable</Typography>
        <Alert severity="error">{errorMessage}</Alert>
        <Typography color="text.secondary">
          Waiting for the birthday module to come back and checking again every few seconds.
        </Typography>
      </Stack>
    </Paper>
  );
}

class BirthdayFeatureErrorBoundary extends Component<
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
      errorMessage: error instanceof Error ? error.message : "Unable to load the Nicole app.",
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <BirthdayFeatureUnavailableState
          errorMessage={this.state.errorMessage ?? "Unable to load the Nicole app."}
          onRecovered={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}

function BirthdayFeatureLoadingState() {
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
        <Typography>Loading Nicole app...</Typography>
      </Stack>
    </Paper>
  );
}

export function BirthdayFeatureHost(props: BirthdayFeatureProps) {
  return (
    <BirthdayFeatureErrorBoundary>
      <Suspense fallback={<BirthdayFeatureLoadingState />}>
        <RemoteBirthdayFeature {...props} />
      </Suspense>
    </BirthdayFeatureErrorBoundary>
  );
}
