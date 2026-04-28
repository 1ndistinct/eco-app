# AGENTS

## Mission
Build and maintain echo-agentic-todo-postfix-20260411210213 as a standard multi-service subsystem repository.

## Repo Navigation
- Start with notes/index.md.
- Main services live under services/app-shell, services/app-todo, services/web, and services/web-todo.
- Deployment assets live under deploy/helm/app and deploy/k3d.

## Repo Conventions
- Keep deployables under services/.
- Use system/ for runtime-owned identity guidance.
- Use notes/ for workspace rules, ADRs, and task handoffs.

## Style Guides
- Backend: Go, using `services/app-shell/docs/go-style.md` for new and changed backend code.
- Frontend: React + Vite + TypeScript.
- Prefer Taskfile commands for local work.

## Agent Model
- Use coordinator-led specialist routing.
- Treat notes/agents/ as the repo-local specialist continuity layer.
- Treat notes/agents/registry.md and system/agents/registry.md as the source of truth for specialist roles, capabilities, and owned scopes.
- Use the specialist whose owned scope matches the files being changed, and keep one coordinating view over integration, notes, and final validation.
- When parallel work is available and permitted, split it only across disjoint owned scopes from the registries.
- Do not parallelize overlapping write scopes; route cross-cutting decisions back through the coordinating view.
- Treat system/teams/platform/policy.json as the default validation contract for changed scopes unless a deeper repo rule overrides it.
- Backend defines shared contracts before frontend integrates against them.
- Default public routing is one Traefik host with frontend at `/` and backend under `/api`.
- Shipped validation should include the host probes and `task test:e2e` when that browser path exists.

## Tooling Expectations
- task setup
- task test
- task test:e2e
- task lint
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

## Notes Expectations
- Keep notes/index.md, notes/setup.md, notes/tasks/, and notes/architecture/ current.

## Definition Of Done
- Code or docs changed are validated or explicitly not run.
- Notes and ADRs are updated when the repo contract changes.
