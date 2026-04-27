package shellmigrations

import (
	"embed"

	"github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app-shell/internal/apiruntime"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func Spec() apiruntime.MigrationSet {
	return apiruntime.MigrationSet{
		Dir:       "migrations",
		TableName: "goose_db_version_shell",
		FS:        migrationsFS,
	}
}
