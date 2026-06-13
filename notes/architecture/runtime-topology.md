# Runtime Topology

The local default is k3d plus Helm. echo-agentic-todo-postfix-20260411210213 now ships two
backend workloads plus three frontend workloads on one public host exposed through Traefik:

- the shell frontend serves the authenticated app chrome and client routes, including
  `/workspaces/:id`, `/todo/workspaces/:id`, and `/nicole/workspaces/:id`
- the nicole remote serves Module Federation assets under `/nicole/remoteEntry.js` and `/nicole/assets/*`
- the todo remote serves Module Federation assets under `/todo/remoteEntry.js` and `/todo/assets/*`
- the shell API serves auth, workspace, and collaborator traffic under `/api`, excluding todo routes
- the todo API serves `/api/todos`, owns the todo-specific database migrations, and publishes/subscribes realtime todo events over NATS for SSE clients
- workspace identifiers are UUIDs across both APIs and both frontends, with upgrade-only bigint compatibility columns retained during migration rollout
- upgrade rollouts bootstrap the split shell/todo goose tables from the legacy monolith goose history before applying any split-owned migrations

The ingress split is deliberate: workspace routes stay on the shell frontend, while only the
remote entry file and remote asset paths are forwarded to each federated frontend service.
