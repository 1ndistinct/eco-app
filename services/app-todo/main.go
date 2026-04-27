package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"

	"github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app-todo/internal/apiruntime"
	"github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app-todo/internal/httpapi"
	shellmigrations "github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app-todo/internal/migrations/shell"
	todomigrations "github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app-todo/internal/migrations/todo"
)

func main() {
	ctx := context.Background()

	db, err := apiruntime.OpenDatabase(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	store := httpapi.NewPostgresStore(db)

	if len(os.Args) > 1 {
		if err := runCommand(ctx, db, os.Args[1:]); err != nil {
			log.Fatal(err)
		}
		return
	}

	todoEvents, err := httpapi.NewTodoEventBroker(strings.TrimSpace(os.Getenv("NATS_URL")))
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := todoEvents.Close(); err != nil {
			log.Printf("close todo event broker: %v", err)
		}
	}()

	if err := apiruntime.WaitForMigrationSets(ctx, db, shellmigrations.Spec(), todomigrations.Spec()); err != nil {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr:    ":8080",
		Handler: httpapi.NewTodoHandler(store, httpapi.HandlerOptions{TodoEvents: todoEvents}),
	}
	log.Printf("todo api listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}

func runCommand(ctx context.Context, db *sqlx.DB, args []string) error {
	switch args[0] {
	case "migrate":
		if err := apiruntime.WaitForMigrations(ctx, db, shellmigrations.Spec()); err != nil {
			return err
		}
		if err := apiruntime.RunMigrations(ctx, db, todomigrations.Spec()); err != nil {
			return err
		}
		log.Print("todo database migrations applied")
		return nil
	default:
		return fmt.Errorf("unknown command %q", args[0])
	}
}
