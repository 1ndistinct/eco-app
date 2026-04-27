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

	"github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app-shell/internal/apiruntime"
	"github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app-shell/internal/httpapi"
	shellmigrations "github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app-shell/internal/migrations/shell"
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
		if err := runCommand(ctx, store, db, os.Args[1:]); err != nil {
			log.Fatal(err)
		}
		return
	}

	if err := apiruntime.WaitForMigrations(ctx, db, shellmigrations.Spec()); err != nil {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr: ":8080",
		Handler: httpapi.NewShellHandler(httpapi.NewPostgresStore(db), httpapi.HandlerOptions{
			GoogleAuth: httpapi.GoogleAuthConfig{
				ClientID:      strings.TrimSpace(os.Getenv("GOOGLE_OAUTH_CLIENT_ID")),
				ClientSecret:  strings.TrimSpace(os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")),
				PublicBaseURL: strings.TrimSpace(os.Getenv("GOOGLE_OAUTH_PUBLIC_BASE_URL")),
			},
		}),
	}
	log.Printf("app api listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}

func runCommand(ctx context.Context, store *httpapi.PostgresStore, db *sqlx.DB, args []string) error {
	switch args[0] {
	case "migrate":
		if err := apiruntime.RunMigrations(ctx, db, shellmigrations.Spec()); err != nil {
			return err
		}
		log.Print("database migrations applied")
		return nil
	case "create-user":
		if len(args) < 2 {
			return fmt.Errorf("usage: app-api create-user <email>")
		}

		provisionedUser, err := store.ProvisionUser(ctx, args[1])
		if err != nil {
			return err
		}

		fmt.Printf("email=%s\n", provisionedUser.Email)
		fmt.Printf("password=%s\n", provisionedUser.Password)
		fmt.Println("password_reset_required=true")
		return nil
	default:
		return fmt.Errorf("unknown command %q", args[0])
	}
}
