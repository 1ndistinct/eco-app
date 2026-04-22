# Setup

Use Taskfile commands for echo-agentic-todo-postfix-20260411210213.

- task setup
- task install
- task test:backend
- task test:frontend
- task test
- task test:e2e
- task deploy
- task deploy:docker
- task docker:push
- task helm:template
- task tilt:up
- task tilt:down
- task probe:app
- task probe:web
- task cleanup
- tilt ci

The agent-oriented BuildKit path uses task deploy and pushes to k3d-echo-registry.localhost:5000 by default.
The human Docker path uses task deploy:docker and pushes to localhost:5001 by default so a host Docker daemon can publish into the same local k3d registry.
Set PUSH_REGISTRY and CLUSTER_REGISTRY together when you want Docker pushes and cluster pulls to use a different registry.
Default external routing uses one Traefik host with path-based endpoints:
- frontend: http://app.localhost/
- backend: http://app.localhost/api/healthz
Use task probe:app:external and task probe:web:external to verify the ingress path from the host.
The default repo validation paths now run the browser flow as well:
- `task ci`
- `tilt ci`
`task ci` automatically falls back to `task deploy:docker` when `buildctl-daemonless.sh` is not installed locally.
