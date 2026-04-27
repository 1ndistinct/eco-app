{{- define "app.name" -}}
{{ .Chart.Name }}
{{- end -}}

{{- define "app.fullname" -}}
{{ .Release.Name }}
{{- end -}}

{{- define "app.appServiceName" -}}
{{ include "app.fullname" . }}-app
{{- end -}}

{{- define "app.todoApiServiceName" -}}
{{ include "app.fullname" . }}-todo-api
{{- end -}}

{{- define "app.webServiceName" -}}
{{ include "app.fullname" . }}-web
{{- end -}}

{{- define "app.webTodoServiceName" -}}
{{ include "app.fullname" . }}-web-todo
{{- end -}}

{{- define "app.postgresServiceName" -}}
{{ include "app.fullname" . }}-postgres
{{- end -}}

{{- define "app.natsServiceName" -}}
{{ include "app.fullname" . }}-nats
{{- end -}}

{{- define "app.appMigrationJobName" -}}
{{ include "app.fullname" . }}-app-migrate-{{ .Release.Revision }}
{{- end -}}

{{- define "app.todoApiMigrationJobName" -}}
{{ include "app.fullname" . }}-todo-api-migrate-{{ .Release.Revision }}
{{- end -}}

{{- define "app.databaseURL" -}}
postgres://{{ .Values.postgres.user }}:{{ .Values.postgres.password }}@{{ include "app.postgresServiceName" . }}:{{ .Values.postgres.port }}/{{ .Values.postgres.database }}?sslmode=disable
{{- end -}}

{{- define "app.ingressHostMatch" -}}
{{- $defaultHosts := list (printf "%s.localhost" (include "app.fullname" .)) -}}
{{- $hosts := default $defaultHosts .Values.ingress.hosts -}}
{{- if .Values.ingress.host -}}
Host(`{{ .Values.ingress.host }}`)
{{- else -}}
{{- range $index, $host := $hosts -}}
{{- if gt $index 0 }} || {{ end -}}Host(`{{ $host }}`)
{{- end -}}
{{- end -}}
{{- end -}}
