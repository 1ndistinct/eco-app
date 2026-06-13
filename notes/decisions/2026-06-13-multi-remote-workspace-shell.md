# Multi-Remote Workspace Shell

## Status
Accepted

## Decision
- The shell frontend may mount more than one federated workspace app under the same authenticated
  chrome.
- Workspace URLs are app-aware: the default todo experience continues to support
  `/workspaces/:workspaceId`, while non-default apps use `/:appId/workspaces/:workspaceId`.
- Each remote owns its runtime UI implementation and is exposed through its own service plus its
  own Module Federation asset path.
- Ingress routes only each remote's `remoteEntry.js` and asset files to that remote service; the
  shell frontend keeps all workspace page routes, including `/nicole/workspaces/:workspaceId`.

## Why
- The birthday experience for Nicole needs to ship as a lightweight remote without forking the
  authenticated shell or breaking the todo app.
- Reusing the shell keeps auth, workspace selection, and top-level navigation in one place.
- Keeping page routes on the shell avoids client-route conflicts with the remote asset host paths.

## Consequences
- New workspace apps require a shell registry entry, a host loader, local dev proxies, Helm
  deployment/service manifests, and Taskfile image wiring.
- The default app remains todo for legacy links and existing workspace bookmarks.
- Todo continues to be remote-owned; the shell must not grow a competing local todo panel.
