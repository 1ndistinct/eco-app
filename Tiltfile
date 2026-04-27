watch_settings(
  ignore=[
    ".git",
    ".cache",
    "node_modules",
    "services/web/node_modules",
    "services/web/dist",
    "services/web-todo/node_modules",
    "services/web-todo/dist",
  ],
)

deploy_deps = [
  "Taskfile.yml",
  "Tiltfile",
  "go.mod",
  "deploy/helm",
  "deploy/k3d",
  "services/app",
  "services/app-shell",
  "services/app-todo",
  "services/web",
  "services/web-todo",
]

local_resource(
  "deploy-docker",
  "task deploy:docker",
  deps=deploy_deps,
)

local_resource(
  "verify-external",
  "task probe:app:external && task probe:web:external",
  resource_deps=["deploy-docker"],
)

local_resource(
  "browser-e2e",
  "task test:e2e",
  resource_deps=["verify-external"],
)

local_resource(
  "deploy-buildkit",
  "task deploy",
  deps=deploy_deps,
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
)

local_resource(
  "cleanup",
  "task cleanup",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)

local_resource(
  "ci",
  "task ci",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
)

local_resource(
  "status",
  "task status",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)

local_resource(
  "urls",
  "task urls",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)

local_resource(
  "probe-app-external",
  "task probe:app:external",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)

local_resource(
  "probe-web-external",
  "task probe:web:external",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)

local_resource(
  "logs-app",
  "task logs -- app",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)

local_resource(
  "logs-todo-api",
  "task logs -- todo-api",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)

local_resource(
  "logs-web",
  "task logs -- web",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)

local_resource(
  "logs-web-todo",
  "task logs -- web-todo",
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  allow_parallel=True,
)
