# Echo Agentic Todo Postfix 20260411210213

This repository is the standard multi-service starting point for echo-agentic-todo-postfix-20260411210213.

## Services
- services/app: Go backend
- services/web: React frontend

## Data
- Todos are stored in Postgres.
- Goose migrations are embedded in the backend image.
- Helm deploys a migration Job before the app becomes ready, and the app waits for the latest migration version on startup.

## Quick Start
- task setup
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

## External URLs
- Frontend: http://app.localhost/
- Backend API: http://app.localhost/api/healthz

## Ingress
- `task deploy:docker` deploys both services behind a single-host Traefik `IngressRoute`.
- `task test:e2e` runs a browser flow against the same public host and real backend.
- `task ci` and `tilt ci` both include the host probes plus `task test:e2e` for deployed validation.
- `task ci` falls back to `task deploy:docker` automatically when local BuildKit is unavailable.
- `task probe:app:external` verifies `http://app.localhost/api/healthz`
- `task probe:web:external` verifies `http://app.localhost/`

## Notes
- notes/index.md
- notes/setup.md

## GitHub
- Repository: https://github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213
