# Component Map

- services/app-shell: deployable Go shell API for auth, sessions, workspaces, and collaborators
- services/app-todo: deployable Go todo API for `/api/todos`
- services/web: React shell frontend with auth, workspace chrome, and host-side routing
- services/web-todo: federated React todo remote served under `/todo/remoteEntry.js` and `/todo/assets/*`
- deploy/helm/app: Kubernetes packaging
