# Backend Support

`services/app/` now holds backend support code that is not owned by a specific API deployment.

Contents:
- `cmd/worker/`: worker entrypoint
- `scripts/`: backend helper scripts
- `docs/go-style.md`: default Go style guide for new and changed backend code

Deployable backend roots live in:
- `services/app-shell`
- `services/app-todo`

Use repo-root `task` commands for standard workflows.
