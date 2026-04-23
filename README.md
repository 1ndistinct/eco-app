# Echo Agentic Todo Postfix 20260411210213

This repository is the standard multi-service starting point for echo-agentic-todo-postfix-20260411210213.

## Services
- services/app: Go backend
- services/web: React frontend

## Data
- Todos are stored in Postgres.
- Goose migrations are embedded in the backend image.
- Helm deploys a migration Job before the app becomes ready, and the app waits for the latest migration version on startup.
- Users are keyed by email, passwords are stored as hashes, and sessions are stored server-side in Postgres.
- Each user owns a workspace, and workspaces can be shared with collaborators who currently receive the same permissions as the owner.

## Quick Start
- task setup
- task k3d:bootstrap
- EMAIL=user@example.com task user:create:cluster
- task test
- task test:e2e
- task deploy
- task deploy:docker
- task deploy:docker:tm
- task docker:push
- task helm:template
- task tilt:up
- task tilt:down
- task probe:app
- task probe:web
- task cleanup
- tilt ci

## External URLs
- Local frontend: http://eco.localhost/
- Local backend API: http://eco.localhost/api/healthz
- `deploy/k3d/tm.values.yaml` adds `192.168.1.84` and `eco.treehousehl.com` for the `tm` box.
- Override the ingress host for a one-off run with `INGRESS_HOST=<host>`.

## Auth
- The UI now requires login before any todo data is shown.
- Provisioned users receive an auto-generated password and must reset it on first login.
- Google login is supported for already-provisioned users only when the verified Google account is a Gmail address and exactly matches the stored user email.
- Keep Google OAuth credentials in a local-only Helm values file such as `deploy/k3d/tm.secrets.yaml`, based on `deploy/k3d/tm.secrets.example.yaml`.
- For the `tm` deployment, set the Google OAuth public base URL to `https://eco.treehousehl.com`.
- Register `https://eco.treehousehl.com/api/auth/google/callback` as the Google OAuth redirect URI for the `tm` deployment.

## Ingress
- `task deploy:docker` deploys both services behind a Traefik `IngressRoute`.
- `task k3d:bootstrap` creates the expected `echo` k3d cluster and `echo-registry.localhost` registry.
- `deploy/k3d/local.values.yaml` is the default local-machine k3d values file.
- `deploy/k3d/tm.values.yaml` is the `tm`-specific k3d values file.
- Set `K3D_SECRETS_FILE=./deploy/k3d/tm.secrets.yaml` to layer local-only Helm secrets into `task helm:template`, `task deploy`, or `task deploy:docker`.
- `task deploy:docker:tm` deploys to `tm` with `deploy/k3d/tm.values.yaml` and auto-loads `deploy/k3d/tm.secrets.yaml` when that file exists.
- `task test:e2e` runs a browser flow against the same public host and real backend.
- `task ci` and `tilt ci` both include the host probes plus `task test:e2e` for deployed validation.
- `task ci` falls back to `task deploy:docker` automatically when local BuildKit is unavailable.
- Set `K3D_VALUES_FILE=./deploy/k3d/tm.values.yaml` on `tm` to deploy and probe against `192.168.1.84`.
- Standard `tm` deploy with Google OAuth: `task deploy:docker:tm`.

## Notes
- notes/index.md
- notes/setup.md

## GitHub
- Repository: https://github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213
