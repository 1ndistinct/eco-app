#!/bin/sh

set -eu

email="${EMAIL:-}"
if [ -z "$email" ]; then
  echo "EMAIL is required" >&2
  exit 1
fi

namespace="${APP_NAMESPACE:-app-system}"
release="${APP_RELEASE_NAME:-app}"
deployment="${release}-app"
job="${release}-app-create-user-$(date +%s)"

image="$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath="{.spec.template.spec.containers[0].image}")"
database_url="$(
  kubectl get deployment "$deployment" -n "$namespace" -o jsonpath="{range .spec.template.spec.containers[0].env[*]}{.name}={.value}{'\n'}{end}" |
    awk -F= '$1 == "DATABASE_URL" { print substr($0, index($0, "=") + 1) }'
)"

if [ -z "$image" ] || [ -z "$database_url" ]; then
  echo "failed to resolve image or DATABASE_URL from deployment $deployment" >&2
  exit 1
fi

cleanup() {
  kubectl delete job "$job" -n "$namespace" --ignore-not-found >/dev/null 2>&1 || true
}

trap cleanup EXIT

kubectl apply -n "$namespace" -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: $job
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: create-user
          image: $image
          imagePullPolicy: IfNotPresent
          args:
            - create-user
            - $email
          env:
            - name: DATABASE_URL
              value: $database_url
EOF

if ! kubectl wait --for=condition=complete "job/$job" -n "$namespace" --timeout="${DEPLOY_TIMEOUT:-5m}" >/dev/null 2>&1; then
  kubectl logs -n "$namespace" "job/$job" >&2 || true
  exit 1
fi

kubectl logs -n "$namespace" "job/$job"
