package apiruntime

import (
	"context"
	"fmt"
	"io/fs"
	"strings"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
)

type MigrationSet struct {
	Dir       string
	TableName string
	FS        fs.FS
}

var gooseMu sync.Mutex

func OpenDatabase(ctx context.Context, databaseURL string) (*sqlx.DB, error) {
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

func RunMigrations(ctx context.Context, db *sqlx.DB, migrationSet MigrationSet) error {
	gooseMu.Lock()
	defer gooseMu.Unlock()

	if err := configureGooseLocked(migrationSet); err != nil {
		return err
	}

	if err := goose.UpContext(ctx, db.DB, migrationSet.Dir); err != nil {
		return fmt.Errorf("run goose migrations: %w", err)
	}

	return nil
}

func WaitForMigrationSets(ctx context.Context, db *sqlx.DB, migrationSets ...MigrationSet) error {
	for _, migrationSet := range migrationSets {
		if err := WaitForMigrations(ctx, db, migrationSet); err != nil {
			return err
		}
	}

	return nil
}

func WaitForMigrations(ctx context.Context, db *sqlx.DB, migrationSet MigrationSet) error {
	gooseMu.Lock()
	defer gooseMu.Unlock()

	if err := configureGooseLocked(migrationSet); err != nil {
		return err
	}

	migrations, err := goose.CollectMigrations(migrationSet.Dir, 0, goose.MaxVersion)
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

		time.Sleep(1 * time.Second)
	}

	if err != nil {
		return fmt.Errorf("wait for migrations: %w", err)
	}
	return fmt.Errorf("wait for migrations: timed out before reaching version %d", latestMigration.Version)
}

func configureGooseLocked(migrationSet MigrationSet) error {
	goose.SetBaseFS(migrationSet.FS)
	goose.SetTableName(migrationSet.TableName)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("configure goose dialect: %w", err)
	}

	return nil
}
