# Agent Registry

| Name | Toolkit | Team | Job Title | Scope | Status | Toolkit Guidance Path | Capabilities | Owned Scopes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Echo | coordinator | platform | global-coordinator | global | active | /opt/echo-tools/coordinator/AGENTS.md | routing, memory-promotion, github-read, github-write-coordinator | notes/tasks/*, notes/projects/*, notes/decisions/* |
| Ada | bootstrap | platform | bootstrap-specialist | global | active | /opt/echo-tools/bootstrap/AGENTS.md | repo-bootstrap, standards-propagation, github-read, github-write-assigned | services/*, deploy/*, notes/setup.md |
| Beck | backend | platform | backend-specialist | repo | active | /opt/echo-tools/backend/AGENTS.md | service-implementation, github-read, github-write-assigned | go.mod, go.sum, services/app/*, services/app-shell/*, services/app-todo/*, services/api/* |
| Faye | frontend | platform | frontend-specialist | repo | active | /opt/echo-tools/frontend/AGENTS.md | ui-implementation, github-read, github-write-assigned | services/web/*, Taskfile.yml, pnpm-lock.yaml, pnpm-workspace.yaml |
| Dex | devops | platform | devops-specialist | repo | active | /opt/echo-tools/devops/AGENTS.md | deploy-config, ci, github-read, github-write-assigned | deploy/*, Tiltfile, Taskfile.yml, services/app-shell/Dockerfile, services/app-todo/Dockerfile, services/web/Dockerfile, services/web/nginx/* |
| Sable | security | platform | security-specialist | repo | active | /opt/echo-tools/security/AGENTS.md | secure-design-review, threat-review, pentest-validation, github-read, github-write-assigned | deploy/*, services/app/*, services/app-shell/*, services/app-todo/*, services/web/nginx/*, notes/decisions/*, notes/architecture/* |
| Nia | data-messaging | platform | data-messaging-specialist | repo | active | /opt/echo-tools/data-messaging/AGENTS.md | schema-contracts, github-read, github-write-assigned | go.mod, go.sum, services/api/*, services/app/*, services/app-shell/*, services/app-todo/*, notes/architecture/* |
| Quinn | qa-review | platform | qa-review-specialist | repo | active | /opt/echo-tools/qa-review/AGENTS.md | validation, review, github-read, github-write-assigned | tests/*, Taskfile.yml, services/app/*, services/app-shell/*, services/app-todo/*, services/web/*, services/web/tests/* |
| Mira | docs-standards | platform | docs-standards-specialist | repo | active | /opt/echo-tools/docs-standards/AGENTS.md | docs-governance, memory-hygiene, github-read, github-write-assigned | notes/*, system/*, AGENTS.md, README.md |
