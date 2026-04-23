# App Service

`services/app/` is the backend workspace root for this repository.

Contents:
- `cmd/`: executable entrypoints
- `internal/`: service packages, repositories, migrations, and tests
- `scripts/`: backend helper scripts
- `Dockerfile`: primary backend container build
- `docs/go-style.md`: default Go style guide for new and changed backend code

Use repo-root `task` commands for standard workflows. Direct Go package operations should target `./services/app/...`.
