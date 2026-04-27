# System Design

echo-agentic-todo-postfix-20260411210213 is a standard multi-service repo with a Go API, a React shell app, a federated React todo remote, Helm packaging, notes, and system guidance.
Authenticated users receive server-side sessions, a default personal workspace, and can create additional named workspaces that scope todos and collaborator sharing.
The shell owns auth, workspace routing, and shared UI chrome; the todo experience is loaded at runtime through Module Federation from the separately built `services/web-todo` bundle.
The backend now follows the same boundary: `services/app-shell` owns auth/workspaces/shares with its own internal runtime packages, while `services/app-todo` owns `/api/todos`, SSE todo updates, and the todo migration set with its own internal runtime packages plus NATS-backed event fanout.
