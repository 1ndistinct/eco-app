package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"

	"github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app/internal/httpapi"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func main() {
	ctx := context.Background()

	db, err := openDatabase(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		if err := runMigrations(ctx, db); err != nil {
			log.Fatal(err)
		}
		log.Print("database migrations applied")
		return
	}

	if err := waitForMigrations(ctx, db); err != nil {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr:    ":8080",
		Handler: httpapi.NewHandler(httpapi.NewPostgresStore(db)),
	}
	log.Printf("app api listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}

func openDatabase(ctx context.Context, databaseURL string) (*sqlx.DB, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	db, err := sqlx.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open postgres connection: %w", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(30 * time.Minute)

	deadlineCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var pingErr error
	for deadlineCtx.Err() == nil {
		pingCtx, pingCancel := context.WithTimeout(deadlineCtx, 3*time.Second)
		pingErr = db.PingContext(pingCtx)
		pingCancel()
		if pingErr == nil {
			return db, nil
		}

		time.Sleep(1 * time.Second)
	}

	_ = db.Close()
	return nil, fmt.Errorf("connect to postgres: %w", pingErr)
}

func runMigrations(ctx context.Context, db *sqlx.DB) error {
	configureGoose()
	if err := goose.UpContext(ctx, db.DB, "migrations"); err != nil {
		return fmt.Errorf("run goose migrations: %w", err)
	}
	return nil
}

func waitForMigrations(ctx context.Context, db *sqlx.DB) error {
	configureGoose()

	migrations, err := goose.CollectMigrations("migrations", 0, goose.MaxVersion)
	if err != nil {
		return fmt.Errorf("collect goose migrations: %w", err)
	}
	if len(migrations) == 0 {
		return nil
	}

	latestMigration, err := migrations.Last()
	if err != nil {
		return fmt.Errorf("resolve latest migration: %w", err)
	}

	deadlineCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	var currentVersion int64
	for deadlineCtx.Err() == nil {
		currentVersion, err = goose.GetDBVersionContext(deadlineCtx, db.DB)
		if err == nil && currentVersion >= latestMigration.Version {
			return nil
		}

		log.Printf("waiting for migrations: current=%d target=%d", currentVersion, latestMigration.Version)
		time.Sleep(1 * time.Second)
	}

	if err != nil {
		return fmt.Errorf("wait for migrations: %w", err)
	}
	return fmt.Errorf("wait for migrations: timed out before reaching version %d", latestMigration.Version)
}

func configureGoose() {
	goose.SetBaseFS(migrationsFS)
	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("configure goose dialect: %v", err)
	}
}
