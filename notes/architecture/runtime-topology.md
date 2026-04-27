# Runtime Topology

The local default is k3d plus Helm. echo-agentic-todo-postfix-20260411210213 now ships two backend workloads plus two frontend workloads on one public host exposed through Traefik:

- the shell frontend serves the authenticated app chrome and client routes
- the todo remote serves Module Federation assets under `/todo/remoteEntry.js` and `/todo/assets/*`
- the shell API serves auth, workspace, and collaborator traffic under `/api`, excluding todo routes
- the todo API serves `/api/todos` and owns the todo-specific database migrations
