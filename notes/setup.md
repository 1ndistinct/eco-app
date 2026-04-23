# Setup

Use Taskfile commands for echo-agentic-todo-postfix-20260411210213.

- task setup
- task install
- task k3d:bootstrap
- EMAIL=user@example.com task user:create:cluster
- task test:backend
- task test:frontend
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

The agent-oriented BuildKit path uses task deploy and pushes to k3d-echo-registry.localhost:5000 by default.
The human Docker path uses task deploy:docker and pushes to localhost:5001 by default so a host Docker daemon can publish into the same local k3d registry.
Set PUSH_REGISTRY and CLUSTER_REGISTRY together when you want Docker pushes and cluster pulls to use a different registry.
Use `task k3d:bootstrap` to create the expected `echo` cluster and `echo-registry.localhost` registry on a fresh machine.
The backend now requires `DATABASE_URL` for local runtime; `task dev` runs the embedded goose migrations first and then starts the API.
The Helm chart runs the same migration entrypoint as a dedicated Kubernetes Job, and the API waits for the latest migration version before it serves traffic.
Users are provisioned explicitly. Use `go run ./services/app/cmd/api create-user <email>` against a local database, or `EMAIL=<email> task user:create:cluster` against the deployed cluster. The command prints the generated temporary password, and the user must reset it on first login.
Google login is optional. Configure these app env vars when you want it:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_PUBLIC_BASE_URL`
In the Helm chart, these come from:
- `googleOAuth.clientID`
- `googleOAuth.clientSecret`
- `googleOAuth.publicBaseURL`
Keep local-only OAuth values in a separate Helm values file such as `deploy/k3d/tm.secrets.yaml`, based on `deploy/k3d/tm.secrets.example.yaml`.
Google login only succeeds when the verified Google account is a Gmail address and exactly matches an already-provisioned user email.
Google-authenticated provisioned users still must complete the initial password reset before todo or share access unlocks.
That first-login password setup only requires the new password because the authenticated session already proves identity.
Default external routing uses one Traefik host with path-based endpoints:
- local frontend: http://eco.localhost/
- local backend: http://eco.localhost/api/healthz
The local-machine k3d environment default lives in `deploy/k3d/local.values.yaml`.
Use `K3D_VALUES_FILE=./deploy/k3d/tm.values.yaml` on `tm` to deploy with:
- frontend: http://192.168.1.84/
- backend: http://192.168.1.84/api/healthz
- alias: http://eco.treehousehl.com/
Set `K3D_SECRETS_FILE=./deploy/k3d/tm.secrets.yaml` when you want `task helm:template`, `task deploy`, or `task deploy:docker` to layer those local-only values into the Helm release.
For Google OAuth on `tm`, use `https://eco.treehousehl.com` as `GOOGLE_OAUTH_PUBLIC_BASE_URL`.
Register `https://eco.treehousehl.com/api/auth/google/callback` as the Google OAuth redirect URI for that deployment.
The standard `tm` Docker deploy path with Google OAuth is:
- `task deploy:docker:tm`
`task deploy:docker:tm` always uses `deploy/k3d/tm.values.yaml` and automatically loads `deploy/k3d/tm.secrets.yaml` when that file exists. Override `K3D_SECRETS_FILE` if you need a different local-only secrets file.
Set `INGRESS_HOST=<host>` when you want to force a single ingress host for a one-off run.
Use task probe:app:external and task probe:web:external to verify the ingress path from the host.
The default repo validation paths now run the browser flow as well:
- `task ci`
- `tilt ci`
`task ci` automatically falls back to `task deploy:docker` when `buildctl-daemonless.sh` is not installed locally.
`task test:e2e` now expects `PLAYWRIGHT_LOGIN_EMAIL` and `PLAYWRIGHT_LOGIN_PASSWORD`; set `PLAYWRIGHT_RESET_PASSWORD` as well if the test user still needs the first-login password reset flow.
