# Workspace UUIDs And Federated Todo UI

## Status
Accepted

## Decision
- Workspace identifiers are UUIDs at the service and frontend boundary.
- Fresh installs create UUID workspace references directly in `workspaces`, `workspace_memberships`, and `todos`.
- Upgrades preserve existing bigint workspace keys only as compatibility columns (`legacy_id`, `legacy_workspace_id`) during migration.
- The shell frontend hosts the todo experience exclusively through the federated `services/web-todo` remote; it must not carry a competing local todo panel.

## Why
- UUID workspace IDs remove cross-service dependence on database-local autoincrement sequences.
- The shell API, todo API, shell frontend, and federated todo frontend now share the same identifier format.
- Keeping temporary legacy columns lets production data move forward without rewriting ownership or todo associations out of band.
- One mounted todo implementation avoids drift between the shell app and the federated remote.

## Consequences
- Backend stores validate workspace IDs as UUIDs.
- Schema cleanup can remove the legacy bigint columns in a later migration after upgraded environments have fully rolled forward.
- Frontend routing and API payloads continue to treat workspace IDs as opaque strings.
