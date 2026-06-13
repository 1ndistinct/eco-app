# Multi-Remote Workspace Shell

## Status
In progress

## Implemented
- `services/web` now treats workspace app selection as shell state and maps workspace URLs through
  `services/web/src/app/workspaceRouting.ts`.
- `services/web-todo` remains the default federated workspace app.
- `services/web-nicole` adds a second federated workspace app for Nicole's birthday collage and is
  served through `/nicole/remoteEntry.js` plus `/nicole/assets/*`.
- Helm, Tilt, and Taskfile flows now build, publish, and deploy the Nicole remote alongside the
  existing shell, todo API, and todo remote.
- The `tm` deployment at `http://eco.treehousehl.com/` now serves the Nicole remote entry and
  keeps `/nicole/workspaces/:workspaceId` on the shell frontend.

## Remaining Next Slices
- Add authenticated end-to-end coverage for selecting a non-default workspace app after login.
- Decide whether future workspace apps should share one generic host-loader registry instead of
  one host component per remote.
- Trim or optimize the birthday image set if remote bundle size becomes a problem in low-bandwidth
  environments.

## Tradeoffs And Risks
- The shell and Nicole remote intentionally share the `/nicole` prefix; ingress must continue to
  forward only remote asset paths to `web-nicole`.
- The birthday remote is image-heavy by design, so build output size is noticeably larger than the
  todo remote.
- The default workspace route remains todo-first for backward compatibility, which means app-aware
  deep links need the `/nicole` prefix to open the birthday experience directly.

## Entrypoints
- Host routing: `services/web/src/App.tsx`, `services/web/src/app/workspaceApps.ts`,
  `services/web/src/app/workspaceRouting.ts`
- Nicole remote: `services/web-nicole/src/exposed/BirthdayFeature.tsx`
- Deploy wiring: `Taskfile.yml`, `deploy/helm/app/templates/app-ingress.yaml`,
  `deploy/helm/app/templates/web-nicole-deployment.yaml`
- Deploy command: `task deploy:docker:tm`
- Live verification: `http://eco.treehousehl.com/nicole/remoteEntry.js`,
  `http://eco.treehousehl.com/nicole/workspaces/<workspace-id>`
