package httpapi

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"strings"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PostgresStore struct {
	db      *sqlx.DB
	builder sq.StatementBuilderType
}

type userRow struct {
	Email                 string `db:"email"`
	PasswordHash          string `db:"password_hash"`
	PasswordResetRequired bool   `db:"password_reset_required"`
}

type workspaceRow struct {
	ID          string `db:"id"`
	OwnerEmail  string `db:"owner_email"`
	Name        string `db:"name"`
	Description string `db:"description"`
}

func NewPostgresStore(db *sqlx.DB) *PostgresStore {
	return &PostgresStore{
		db:      db,
		builder: sq.StatementBuilder.PlaceholderFormat(sq.Dollar),
	}
}

func (s *PostgresStore) AuthenticateUser(ctx context.Context, email string, password string) (SessionUser, error) {
	user, err := s.userByEmail(ctx, normalizeEmail(email))
	if errors.Is(err, sql.ErrNoRows) {
		return SessionUser{}, ErrInvalidCredentials
	}
	if err != nil {
		return SessionUser{}, err
	}

	if err := comparePassword(user.PasswordHash, password); err != nil {
		return SessionUser{}, ErrInvalidCredentials
	}

	return SessionUser{
		Email:                 user.Email,
		PasswordResetRequired: user.PasswordResetRequired,
	}, nil
}

func (s *PostgresStore) AuthenticateGoogleUser(ctx context.Context, email string) (SessionUser, error) {
	normalizedEmail := normalizeEmail(email)
	user, err := s.userByEmail(ctx, normalizedEmail)
	if errors.Is(err, sql.ErrNoRows) {
		return SessionUser{}, ErrUserNotFound
	}
	if err != nil {
		return SessionUser{}, err
	}

	return SessionUser{
		Email:                 user.Email,
		PasswordResetRequired: user.PasswordResetRequired,
	}, nil
}

func (s *PostgresStore) ResetPassword(ctx context.Context, email string, currentPassword string, newPassword string) (SessionUser, error) {
	if err := validatePassword(newPassword); err != nil {
		return SessionUser{}, err
	}

	normalizedEmail := normalizeEmail(email)
	user, err := s.userByEmail(ctx, normalizedEmail)
	if errors.Is(err, sql.ErrNoRows) {
		return SessionUser{}, ErrUserNotFound
	}
	if err != nil {
		return SessionUser{}, err
	}

	if err := comparePassword(user.PasswordHash, currentPassword); err != nil {
		return SessionUser{}, ErrInvalidCredentials
	}

	return s.completePasswordReset(ctx, normalizedEmail, newPassword)
}

func (s *PostgresStore) CompletePasswordReset(ctx context.Context, email string, newPassword string) (SessionUser, error) {
	if err := validatePassword(newPassword); err != nil {
		return SessionUser{}, err
	}

	normalizedEmail := normalizeEmail(email)
	if _, err := s.userByEmail(ctx, normalizedEmail); errors.Is(err, sql.ErrNoRows) {
		return SessionUser{}, ErrUserNotFound
	} else if err != nil {
		return SessionUser{}, err
	}

	return s.completePasswordReset(ctx, normalizedEmail, newPassword)
}

func (s *PostgresStore) completePasswordReset(ctx context.Context, normalizedEmail string, newPassword string) (SessionUser, error) {
	passwordHash, err := hashPassword(newPassword)
	if err != nil {
		return SessionUser{}, err
	}

	query, args, err := s.builder.
		Update("users").
		Set("password_hash", passwordHash).
		Set("password_reset_required", false).
		Where(sq.Eq{"email": normalizedEmail}).
		ToSql()
	if err != nil {
		return SessionUser{}, err
	}

	if _, err := s.db.ExecContext(ctx, query, args...); err != nil {
		return SessionUser{}, err
	}

	return SessionUser{
		Email:                 normalizedEmail,
		PasswordResetRequired: false,
	}, nil
}

func (s *PostgresStore) CreateSession(ctx context.Context, email string) (string, error) {
	token, err := generateSecretString(24)
	if err != nil {
		return "", err
	}

	query, args, err := s.builder.
		Insert("user_sessions").
		Columns("token_hash", "user_email", "expires_at").
		Values(hashToken(token), normalizeEmail(email), time.Now().Add(sessionLifetime)).
		ToSql()
	if err != nil {
		return "", err
	}

	if _, err := s.db.ExecContext(ctx, query, args...); err != nil {
		return "", err
	}

	return token, nil
}

func (s *PostgresStore) GetSession(ctx context.Context, token string) (SessionUser, error) {
	var user SessionUser
	if err := s.db.GetContext(ctx, &user, `
		SELECT users.email, users.password_reset_required
		FROM user_sessions
		JOIN users ON users.email = user_sessions.user_email
		WHERE user_sessions.token_hash = $1 AND user_sessions.expires_at > NOW()
	`, hashToken(token)); errors.Is(err, sql.ErrNoRows) {
		return SessionUser{}, ErrSessionNotFound
	} else if err != nil {
		return SessionUser{}, err
	}

	return user, nil
}

func (s *PostgresStore) DeleteSession(ctx context.Context, token string) error {
	query, args, err := s.builder.
		Delete("user_sessions").
		Where(sq.Eq{"token_hash": hashToken(token)}).
		ToSql()
	if err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, query, args...)
	return err
}

func (s *PostgresStore) ListAccessibleWorkspaces(ctx context.Context, userEmail string) ([]WorkspaceAccess, error) {
	var workspaces []WorkspaceAccess
	if err := s.db.SelectContext(ctx, &workspaces, `
		SELECT id::text AS id, name, description, owner_email, role
		FROM (
			SELECT workspaces.id, workspaces.name, workspaces.description, workspaces.owner_email, 'owner' AS role
			FROM workspaces
			WHERE workspaces.owner_email = $1
			UNION ALL
			SELECT workspaces.id, workspaces.name, workspaces.description, workspaces.owner_email, 'collaborator' AS role
			FROM workspaces
			JOIN workspace_memberships ON workspace_memberships.workspace_id = workspaces.id
			WHERE workspace_memberships.user_email = $1
		) AS accessible_workspaces
		ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END, owner_email ASC, name ASC, id ASC
	`, normalizeEmail(userEmail)); err != nil {
		return nil, err
	}

	if workspaces == nil {
		return []WorkspaceAccess{}, nil
	}

	return workspaces, nil
}

func (s *PostgresStore) CreateWorkspace(ctx context.Context, ownerEmail string, name string, description string) (WorkspaceAccess, error) {
	normalizedOwnerEmail := normalizeEmail(ownerEmail)
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return WorkspaceAccess{}, ErrWorkspaceNameRequired
	}

	exists, err := s.userExists(ctx, normalizedOwnerEmail)
	if err != nil {
		return WorkspaceAccess{}, err
	}
	if !exists {
		return WorkspaceAccess{}, ErrUserNotFound
	}

	return s.insertWorkspace(ctx, s.db, normalizedOwnerEmail, trimmedName, strings.TrimSpace(description))
}

func (s *PostgresStore) DeleteWorkspace(ctx context.Context, actorEmail string, workspaceID string) error {
	parsedWorkspaceID, err := parseWorkspaceID(workspaceID)
	if err != nil {
		return ErrWorkspaceNotFound
	}

	workspace, err := s.workspaceByID(ctx, parsedWorkspaceID)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return ErrWorkspaceNotFound
	}
	if err != nil {
		return err
	}
	if workspace.OwnerEmail != normalizeEmail(actorEmail) {
		return ErrWorkspaceAccessDenied
	}

	query, args, err := s.builder.
		Delete("workspaces").
		Where(workspaceIDEquals("id", parsedWorkspaceID)).
		ToSql()
	if err != nil {
		return err
	}

	result, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrWorkspaceNotFound
	}

	return nil
}

func (s *PostgresStore) ListWorkspaceShares(ctx context.Context, actorEmail string, workspaceID string) ([]WorkspaceShare, error) {
	parsedWorkspaceID, err := parseWorkspaceID(workspaceID)
	if err != nil {
		return nil, ErrWorkspaceAccessDenied
	}
	if err := s.authorizeWorkspace(ctx, normalizeEmail(actorEmail), parsedWorkspaceID); err != nil {
		return nil, err
	}

	query, args, err := s.builder.
		Select("workspace_id::text AS workspace_id", "user_email AS email").
		From("workspace_memberships").
		Where(workspaceIDEquals("workspace_id", parsedWorkspaceID)).
		OrderBy("user_email ASC").
		ToSql()
	if err != nil {
		return nil, err
	}

	var shares []WorkspaceShare
	if err := s.db.SelectContext(ctx, &shares, query, args...); err != nil {
		return nil, err
	}
	if shares == nil {
		return []WorkspaceShare{}, nil
	}

	return shares, nil
}

func (s *PostgresStore) CreateWorkspaceShare(ctx context.Context, actorEmail string, workspaceID string, shareWithEmail string) (WorkspaceShare, error) {
	parsedWorkspaceID, err := parseWorkspaceID(workspaceID)
	if err != nil {
		return WorkspaceShare{}, ErrWorkspaceAccessDenied
	}

	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedShareWithEmail := normalizeEmail(shareWithEmail)
	if normalizedShareWithEmail == "" {
		return WorkspaceShare{}, ErrShareTargetRequired
	}

	workspace, err := s.workspaceByID(ctx, parsedWorkspaceID)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return WorkspaceShare{}, ErrWorkspaceAccessDenied
	}
	if err != nil {
		return WorkspaceShare{}, err
	}
	if normalizedShareWithEmail == workspace.OwnerEmail {
		return WorkspaceShare{}, ErrCannotShareWithOwner
	}
	if err := s.authorizeWorkspace(ctx, normalizedActorEmail, parsedWorkspaceID); err != nil {
		return WorkspaceShare{}, err
	}

	exists, err := s.userExists(ctx, normalizedShareWithEmail)
	if err != nil {
		return WorkspaceShare{}, err
	}
	if !exists {
		return WorkspaceShare{}, ErrUserNotFound
	}

	query, args, err := s.builder.
		Insert("workspace_memberships").
		Columns("workspace_id", "user_email").
		Values(workspaceIDValue(parsedWorkspaceID), normalizedShareWithEmail).
		Suffix("ON CONFLICT (workspace_id, user_email) DO NOTHING").
		ToSql()
	if err != nil {
		return WorkspaceShare{}, err
	}

	if _, err := s.db.ExecContext(ctx, query, args...); err != nil {
		return WorkspaceShare{}, err
	}

	return WorkspaceShare{
		WorkspaceID: workspaceID,
		Email:       normalizedShareWithEmail,
	}, nil
}

func (s *PostgresStore) DeleteWorkspaceShare(ctx context.Context, actorEmail string, workspaceID string, shareWithEmail string) error {
	parsedWorkspaceID, err := parseWorkspaceID(workspaceID)
	if err != nil {
		return ErrWorkspaceAccessDenied
	}

	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedShareWithEmail := normalizeEmail(shareWithEmail)
	if normalizedShareWithEmail == "" {
		return ErrShareTargetRequired
	}

	workspace, err := s.workspaceByID(ctx, parsedWorkspaceID)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return ErrWorkspaceAccessDenied
	}
	if err != nil {
		return err
	}
	if err := s.authorizeWorkspace(ctx, normalizedActorEmail, parsedWorkspaceID); err != nil {
		return err
	}
	if normalizedShareWithEmail == workspace.OwnerEmail {
		return ErrCannotRemoveOwner
	}

	query, args, err := s.builder.
		Delete("workspace_memberships").
		Where(workspaceIDEquals("workspace_id", parsedWorkspaceID)).
		Where(sq.Eq{"user_email": normalizedShareWithEmail}).
		ToSql()
	if err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, query, args...)
	return err
}

func (s *PostgresStore) ListTodos(ctx context.Context, actorEmail string, workspaceID string) ([]Todo, error) {
	parsedWorkspaceID, err := parseWorkspaceID(workspaceID)
	if err != nil {
		return nil, ErrWorkspaceAccessDenied
	}

	if err := s.authorizeWorkspace(ctx, normalizeEmail(actorEmail), parsedWorkspaceID); err != nil {
		return nil, err
	}

	query, args, err := s.builder.
		Select(
			"id::text AS id",
			"title",
			"completed",
			"owner_email",
			"workspace_id::text AS workspace_id",
			"created_at",
			"edited_at",
		).
		From("todos").
		Where(workspaceIDEquals("workspace_id", parsedWorkspaceID)).
		OrderBy("created_at ASC", "id ASC").
		ToSql()
	if err != nil {
		return nil, err
	}

	var items []Todo
	if err := s.db.SelectContext(ctx, &items, query, args...); err != nil {
		return nil, err
	}
	if items == nil {
		return []Todo{}, nil
	}

	return items, nil
}

func (s *PostgresStore) CreateTodo(ctx context.Context, actorEmail string, workspaceID string, title string) (Todo, error) {
	parsedWorkspaceID, err := parseWorkspaceID(workspaceID)
	if err != nil {
		return Todo{}, ErrWorkspaceAccessDenied
	}

	normalizedActorEmail := normalizeEmail(actorEmail)
	if err := s.authorizeWorkspace(ctx, normalizedActorEmail, parsedWorkspaceID); err != nil {
		return Todo{}, err
	}

	workspace, err := s.workspaceByID(ctx, parsedWorkspaceID)
	if errors.Is(err, ErrWorkspaceNotFound) {
		return Todo{}, ErrWorkspaceAccessDenied
	}
	if err != nil {
		return Todo{}, err
	}

	query, args, err := s.builder.
		Insert("todos").
		Columns("workspace_id", "workspace_email", "owner_email", "title").
		Values(workspaceIDValue(parsedWorkspaceID), workspace.OwnerEmail, normalizedActorEmail, title).
		Suffix(
			"RETURNING id::text AS id, title, completed, owner_email, workspace_id::text AS workspace_id, created_at, edited_at",
		).
		ToSql()
	if err != nil {
		return Todo{}, err
	}

	var todo Todo
	if err := s.db.GetContext(ctx, &todo, query, args...); err != nil {
		return Todo{}, err
	}

	return todo, nil
}

func (s *PostgresStore) UpdateTodo(
	ctx context.Context,
	actorEmail string,
	id string,
	title *string,
	completed *bool,
) (Todo, error) {
	numericID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return Todo{}, ErrTodoNotFound
	}

	var workspaceID sql.NullString
	if err := s.db.GetContext(ctx, &workspaceID, `SELECT workspace_id::text FROM todos WHERE id = $1`, numericID); errors.Is(err, sql.ErrNoRows) {
		return Todo{}, ErrTodoNotFound
	} else if err != nil {
		return Todo{}, err
	}
	if !workspaceID.Valid || strings.TrimSpace(workspaceID.String) == "" {
		return Todo{}, ErrTodoNotFound
	}
	if err := s.authorizeWorkspace(ctx, normalizeEmail(actorEmail), workspaceID.String); err != nil {
		return Todo{}, err
	}

	updateBuilder := s.builder.Update("todos")
	if title != nil {
		updateBuilder = updateBuilder.Set("title", *title)
	}
	if completed != nil {
		updateBuilder = updateBuilder.Set("completed", *completed)
	}
	updateBuilder = updateBuilder.Set("edited_at", sq.Expr("NOW()"))

	query, args, err := updateBuilder.
		Where(sq.Eq{"id": numericID}).
		Suffix(
			"RETURNING id::text AS id, title, completed, owner_email, workspace_id::text AS workspace_id, created_at, edited_at",
		).
		ToSql()
	if err != nil {
		return Todo{}, err
	}

	var todo Todo
	if err := s.db.GetContext(ctx, &todo, query, args...); errors.Is(err, sql.ErrNoRows) {
		return Todo{}, ErrTodoNotFound
	} else if err != nil {
		return Todo{}, err
	}

	return todo, nil
}

func (s *PostgresStore) DeleteTodo(ctx context.Context, actorEmail string, id string) (DeletedTodo, error) {
	numericID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return DeletedTodo{}, ErrTodoNotFound
	}

	var workspaceID sql.NullString
	if err := s.db.GetContext(ctx, &workspaceID, `SELECT workspace_id::text FROM todos WHERE id = $1`, numericID); errors.Is(err, sql.ErrNoRows) {
		return DeletedTodo{}, ErrTodoNotFound
	} else if err != nil {
		return DeletedTodo{}, err
	}
	if !workspaceID.Valid || strings.TrimSpace(workspaceID.String) == "" {
		return DeletedTodo{}, ErrTodoNotFound
	}
	if err := s.authorizeWorkspace(ctx, normalizeEmail(actorEmail), workspaceID.String); err != nil {
		return DeletedTodo{}, err
	}

	query, args, err := s.builder.
		Delete("todos").
		Where(sq.Eq{"id": numericID}).
		ToSql()
	if err != nil {
		return DeletedTodo{}, err
	}

	result, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return DeletedTodo{}, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return DeletedTodo{}, err
	}
	if rowsAffected == 0 {
		return DeletedTodo{}, ErrTodoNotFound
	}

	return DeletedTodo{
		ID:          id,
		WorkspaceID: workspaceID.String,
	}, nil
}

func (s *PostgresStore) ProvisionUser(ctx context.Context, email string) (ProvisionedUser, error) {
	normalizedEmail := normalizeEmail(email)
	if err := validateEmail(normalizedEmail); err != nil {
		return ProvisionedUser{}, err
	}

	exists, err := s.userExists(ctx, normalizedEmail)
	if err != nil {
		return ProvisionedUser{}, err
	}
	if exists {
		return ProvisionedUser{}, ErrUserAlreadyExists
	}

	password, err := generateProvisionedPassword()
	if err != nil {
		return ProvisionedUser{}, err
	}
	passwordHash, err := hashPassword(password)
	if err != nil {
		return ProvisionedUser{}, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return ProvisionedUser{}, err
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	query, args, err := s.builder.
		Insert("users").
		Columns("email", "password_hash", "password_reset_required").
		Values(normalizedEmail, passwordHash, true).
		ToSql()
	if err != nil {
		return ProvisionedUser{}, err
	}

	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return ProvisionedUser{}, err
	}
	if _, err := s.insertWorkspace(ctx, tx, normalizedEmail, defaultWorkspaceName, "Default workspace"); err != nil {
		return ProvisionedUser{}, err
	}

	if err := tx.Commit(); err != nil {
		return ProvisionedUser{}, err
	}
	tx = nil

	return ProvisionedUser{
		Email:    normalizedEmail,
		Password: password,
	}, nil
}

func (s *PostgresStore) authorizeWorkspace(ctx context.Context, actorEmail string, workspaceID string) error {
	var exists bool
	if err := s.db.GetContext(ctx, &exists, `
		SELECT EXISTS (
			SELECT 1
			FROM workspaces
			WHERE workspaces.id = $1::uuid
			  AND (
				workspaces.owner_email = $2
				OR EXISTS (
					SELECT 1
					FROM workspace_memberships
					WHERE workspace_memberships.workspace_id = workspaces.id
					  AND workspace_memberships.user_email = $2
				)
			  )
		)
	`, workspaceID, actorEmail); err != nil {
		return err
	}
	if !exists {
		return ErrWorkspaceAccessDenied
	}

	return nil
}

func (s *PostgresStore) userExists(ctx context.Context, email string) (bool, error) {
	var exists bool
	if err := s.db.GetContext(ctx, &exists, `SELECT EXISTS (SELECT 1 FROM users WHERE email = $1)`, email); err != nil {
		return false, err
	}

	return exists, nil
}

func (s *PostgresStore) userByEmail(ctx context.Context, email string) (userRow, error) {
	var user userRow
	if err := s.db.GetContext(ctx, &user, `
		SELECT email, password_hash, password_reset_required
		FROM users
		WHERE email = $1
	`, email); err != nil {
		return userRow{}, err
	}

	return user, nil
}

func (s *PostgresStore) workspaceByID(ctx context.Context, id string) (workspaceRow, error) {
	var workspace workspaceRow
	if err := s.db.GetContext(ctx, &workspace, `
		SELECT id::text AS id, owner_email, name, description
		FROM workspaces
		WHERE id = $1::uuid
	`, id); errors.Is(err, sql.ErrNoRows) {
		return workspaceRow{}, ErrWorkspaceNotFound
	} else if err != nil {
		return workspaceRow{}, err
	}

	return workspace, nil
}

func (s *PostgresStore) insertWorkspace(ctx context.Context, queryer sqlx.QueryerContext, ownerEmail string, name string, description string) (WorkspaceAccess, error) {
	query, args, err := s.builder.
		Insert("workspaces").
		Columns("owner_email", "name", "description").
		Values(ownerEmail, name, description).
		Suffix("RETURNING id::text AS id, name, description, owner_email").
		ToSql()
	if err != nil {
		return WorkspaceAccess{}, err
	}

	var workspace WorkspaceAccess
	if err := sqlx.GetContext(ctx, queryer, &workspace, query, args...); err != nil {
		return WorkspaceAccess{}, err
	}
	workspace.Role = "owner"

	return workspace, nil
}

func parseWorkspaceID(workspaceID string) (string, error) {
	parsedWorkspaceID, err := uuid.Parse(strings.TrimSpace(workspaceID))
	if err != nil {
		return "", err
	}

	return parsedWorkspaceID.String(), nil
}

func workspaceIDEquals(column string, workspaceID string) sq.Sqlizer {
	return sq.Expr(column+" = ?::uuid", workspaceID)
}

func workspaceIDValue(workspaceID string) sq.Sqlizer {
	return sq.Expr("?::uuid", workspaceID)
}
