{{- define "app.name" -}}
{{ .Chart.Name }}
{{- end -}}

{{- define "app.fullname" -}}
{{ .Release.Name }}
{{- end -}}

{{- define "app.appServiceName" -}}
{{ include "app.fullname" . }}-app
{{- end -}}

{{- define "app.webServiceName" -}}
{{ include "app.fullname" . }}-web
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

{{- define "app.databaseURL" -}}
postgres://{{ .Values.postgres.user }}:{{ .Values.postgres.password }}@{{ include "app.postgresServiceName" . }}:{{ .Values.postgres.port }}/{{ .Values.postgres.database }}?sslmode=disable
{{- end -}}
