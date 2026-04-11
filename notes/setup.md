# Setup

Use Taskfile commands for echo-agentic-todo-postfix-20260411210213.

- task install
- task test:backend
- task test:frontend
- task test
- task deploy
- task probe:app
- task probe:web
- task cleanup
- tilt ci

Local image builds push to the k3d-managed registry at k3d-echo-registry.localhost:5000 by default.
Default ingress URLs are http://app.localhost for the frontend and http://api.app.localhost/healthz for the backend.
