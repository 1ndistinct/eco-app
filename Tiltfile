watch_settings(ignore=[".git", ".cache", "node_modules", "services/web/node_modules", "services/web/dist"])

local_resource(
  "ci",
  "task ci",
)

local_resource(
  "status",
  "task status",
  trigger_mode=TRIGGER_MODE_MANUAL,
  allow_parallel=True,
)

local_resource(
  "logs-app",
  "task logs -- app",
  trigger_mode=TRIGGER_MODE_MANUAL,
  allow_parallel=True,
)

local_resource(
  "logs-web",
  "task logs -- web",
  trigger_mode=TRIGGER_MODE_MANUAL,
  allow_parallel=True,
)
