# AGENTS

## Mission
Build and maintain echo-agentic-todo-postfix-20260411210213 as a standard multi-service subsystem repository.

## Repo Navigation
- Start with notes/index.md.
- Main services live under services/app and services/web.
- Deployment assets live under deploy/helm/app and deploy/k3d.

## Repo Conventions
- Keep deployables under services/.
- Use system/ for runtime-owned identity guidance.
- Use notes/ for workspace rules, ADRs, and task handoffs.

## Style Guides
- Backend: Go.
- Frontend: React + Vite + TypeScript.
- Prefer Taskfile commands for local work.

## Agent Model
- Use coordinator-led specialist routing.
- Backend defines shared contracts before frontend integrates against them.

## Tooling Expectations
- task test
- task lint
- task deploy
- task probe:app
- task probe:web
- task cleanup
- tilt ci

## Notes Expectations
- Keep notes/index.md, notes/setup.md, notes/tasks/, and notes/architecture/ current.

## Definition Of Done
- Code or docs changed are validated or explicitly not run.
- Notes and ADRs are updated when the repo contract changes.
