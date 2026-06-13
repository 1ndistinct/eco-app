# Component Map

- services/app-shell: deployable Go shell API for auth, sessions, workspaces, and collaborators
- services/app-todo: deployable Go todo API for `/api/todos`
- services/web: React shell frontend with auth, workspace chrome, app selection, and host-side routing
- services/web-nicole: federated React birthday remote served under `/nicole/remoteEntry.js` and `/nicole/assets/*`
- services/web-todo: federated React todo remote served under `/todo/remoteEntry.js` and `/todo/assets/*`
- deploy/helm/app: Kubernetes packaging
