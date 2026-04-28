package apiruntime

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"strings"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
)

type MigrationSet struct {
	Dir             string
	TableName       string
	LegacyTableName string
	FS              fs.FS
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

	if _, err := prepareMigrationSetLocked(ctx, db, migrationSet); err != nil {
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

	migrations, err := prepareMigrationSetLocked(ctx, db, migrationSet)
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

func prepareMigrationSetLocked(
	ctx context.Context,
	db *sqlx.DB,
	migrationSet MigrationSet,
) (goose.Migrations, error) {
	if err := configureGooseLocked(migrationSet); err != nil {
		return nil, err
	}

	migrations, err := goose.CollectMigrations(migrationSet.Dir, 0, goose.MaxVersion)
	if err != nil {
		return nil, fmt.Errorf("collect goose migrations: %w", err)
	}

	if err := bootstrapMigrationStateLocked(ctx, db, migrationSet, migrations); err != nil {
		return nil, err
	}

	return migrations, nil
}

func bootstrapMigrationStateLocked(
	ctx context.Context,
	db *sqlx.DB,
	migrationSet MigrationSet,
	migrations goose.Migrations,
) error {
	if _, err := goose.EnsureDBVersionContext(ctx, db.DB); err != nil {
		return fmt.Errorf("ensure migration table %s: %w", migrationSet.TableName, err)
	}

	if migrationSet.LegacyTableName == "" || migrationSet.LegacyTableName == migrationSet.TableName || len(migrations) == 0 {
		return nil
	}

	legacyExists, err := migrationTableExists(ctx, db, migrationSet.LegacyTableName)
	if err != nil {
		return fmt.Errorf("check legacy migration table %s: %w", migrationSet.LegacyTableName, err)
	}
	if !legacyExists {
		return nil
	}

	currentVersions, err := appliedMigrationVersions(ctx, db, migrationSet.TableName)
	if err != nil {
		return fmt.Errorf("read migration versions from %s: %w", migrationSet.TableName, err)
	}

	legacyVersions, err := appliedMigrationVersions(ctx, db, migrationSet.LegacyTableName)
	if err != nil {
		return fmt.Errorf("read migration versions from %s: %w", migrationSet.LegacyTableName, err)
	}

	for _, version := range versionsToBootstrap(migrations, legacyVersions, currentVersions) {
		if err := insertAppliedMigrationVersion(ctx, db, migrationSet.TableName, version); err != nil {
			return fmt.Errorf(
				"bootstrap migration version %d into %s from %s: %w",
				version,
				migrationSet.TableName,
				migrationSet.LegacyTableName,
				err,
			)
		}
	}

	return nil
}

func migrationTableExists(ctx context.Context, db *sqlx.DB, tableName string) (bool, error) {
	var existing sql.NullString
	if err := db.GetContext(ctx, &existing, `SELECT to_regclass($1)::text`, tableName); err != nil {
		return false, err
	}

	return existing.Valid && strings.TrimSpace(existing.String) != "", nil
}

func appliedMigrationVersions(
	ctx context.Context,
	db *sqlx.DB,
	tableName string,
) (map[int64]struct{}, error) {
	quotedTableName, err := quoteIdentifier(tableName)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`SELECT version_id FROM %s WHERE is_applied = TRUE`, quotedTableName)

	var versions []int64
	if err := db.SelectContext(ctx, &versions, query); err != nil {
		return nil, err
	}

	applied := make(map[int64]struct{}, len(versions))
	for _, version := range versions {
		applied[version] = struct{}{}
	}

	return applied, nil
}

func insertAppliedMigrationVersion(
	ctx context.Context,
	db *sqlx.DB,
	tableName string,
	version int64,
) error {
	quotedTableName, err := quoteIdentifier(tableName)
	if err != nil {
		return err
	}

	query := fmt.Sprintf(
		`INSERT INTO %s (version_id, is_applied, tstamp) VALUES ($1, TRUE, NOW())`,
		quotedTableName,
	)

	_, err = db.ExecContext(ctx, query, version)
	return err
}

func versionsToBootstrap(
	migrations goose.Migrations,
	legacyVersions map[int64]struct{},
	currentVersions map[int64]struct{},
) []int64 {
	versions := make([]int64, 0, len(migrations))
	for _, migration := range migrations {
		if _, ok := legacyVersions[migration.Version]; !ok {
			continue
		}
		if _, ok := currentVersions[migration.Version]; ok {
			continue
		}

		versions = append(versions, migration.Version)
	}

	return versions
}

func quoteIdentifier(identifier string) (string, error) {
	if strings.TrimSpace(identifier) == "" {
		return "", fmt.Errorf("migration table name is required")
	}

	for _, char := range identifier {
		if char >= 'a' && char <= 'z' {
			continue
		}
		if char >= 'A' && char <= 'Z' {
			continue
		}
		if char >= '0' && char <= '9' {
			continue
		}
		if char == '_' {
			continue
		}

		return "", fmt.Errorf("invalid migration table name %q", identifier)
	}

	return `"` + identifier + `"`, nil
}
