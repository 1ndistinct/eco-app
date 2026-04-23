package httpapi

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"time"

	sq "github.com/Masterminds/squirrel"
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
		SELECT owner_email, role
		FROM (
			SELECT email AS owner_email, 'owner' AS role
			FROM users
			WHERE email = $1
			UNION
			SELECT workspace_email AS owner_email, 'collaborator' AS role
			FROM workspace_memberships
			WHERE user_email = $1
		) AS workspaces
		ORDER BY owner_email ASC
	`, normalizeEmail(userEmail)); err != nil {
		return nil, err
	}

	if workspaces == nil {
		return []WorkspaceAccess{}, nil
	}

	return workspaces, nil
}

func (s *PostgresStore) ListWorkspaceShares(ctx context.Context, actorEmail string, workspaceEmail string) ([]WorkspaceShare, error) {
	normalizedWorkspaceEmail := normalizeEmail(workspaceEmail)
	if err := s.authorizeWorkspace(ctx, normalizeEmail(actorEmail), normalizedWorkspaceEmail); err != nil {
		return nil, err
	}

	query, args, err := s.builder.
		Select("workspace_email", "user_email AS email").
		From("workspace_memberships").
		Where(sq.Eq{"workspace_email": normalizedWorkspaceEmail}).
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

func (s *PostgresStore) CreateWorkspaceShare(ctx context.Context, actorEmail string, workspaceEmail string, shareWithEmail string) (WorkspaceShare, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedWorkspaceEmail := normalizeEmail(workspaceEmail)
	normalizedShareWithEmail := normalizeEmail(shareWithEmail)

	if normalizedShareWithEmail == "" {
		return WorkspaceShare{}, ErrShareTargetRequired
	}
	if normalizedShareWithEmail == normalizedWorkspaceEmail {
		return WorkspaceShare{}, ErrCannotShareWithOwner
	}
	if err := s.authorizeWorkspace(ctx, normalizedActorEmail, normalizedWorkspaceEmail); err != nil {
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
		Columns("workspace_email", "user_email").
		Values(normalizedWorkspaceEmail, normalizedShareWithEmail).
		Suffix("ON CONFLICT (workspace_email, user_email) DO NOTHING").
		ToSql()
	if err != nil {
		return WorkspaceShare{}, err
	}

	if _, err := s.db.ExecContext(ctx, query, args...); err != nil {
		return WorkspaceShare{}, err
	}

	return WorkspaceShare{
		WorkspaceEmail: normalizedWorkspaceEmail,
		Email:          normalizedShareWithEmail,
	}, nil
}

func (s *PostgresStore) ListTodos(ctx context.Context, actorEmail string, workspaceEmail string) ([]Todo, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedWorkspaceEmail := normalizeEmail(workspaceEmail)
	if err := s.authorizeWorkspace(ctx, normalizedActorEmail, normalizedWorkspaceEmail); err != nil {
		return nil, err
	}

	query, args, err := s.builder.
		Select("id::text AS id", "title", "completed", "owner_email", "workspace_email").
		From("todos").
		Where(sq.Eq{"workspace_email": normalizedWorkspaceEmail}).
		OrderBy("id ASC").
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

func (s *PostgresStore) CreateTodo(ctx context.Context, actorEmail string, workspaceEmail string, title string) (Todo, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedWorkspaceEmail := normalizeEmail(workspaceEmail)
	if err := s.authorizeWorkspace(ctx, normalizedActorEmail, normalizedWorkspaceEmail); err != nil {
		return Todo{}, err
	}

	query, args, err := s.builder.
		Insert("todos").
		Columns("workspace_email", "owner_email", "title").
		Values(normalizedWorkspaceEmail, normalizedActorEmail, title).
		Suffix("RETURNING id::text AS id, title, completed, owner_email, workspace_email").
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

func (s *PostgresStore) UpdateCompleted(ctx context.Context, actorEmail string, id string, completed bool) (Todo, error) {
	numericID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return Todo{}, ErrTodoNotFound
	}

	var workspaceEmail string
	if err := s.db.GetContext(ctx, &workspaceEmail, `SELECT workspace_email FROM todos WHERE id = $1`, numericID); errors.Is(err, sql.ErrNoRows) {
		return Todo{}, ErrTodoNotFound
	} else if err != nil {
		return Todo{}, err
	}
	if err := s.authorizeWorkspace(ctx, normalizeEmail(actorEmail), workspaceEmail); err != nil {
		return Todo{}, err
	}

	query, args, err := s.builder.
		Update("todos").
		Set("completed", completed).
		Where(sq.Eq{"id": numericID}).
		Suffix("RETURNING id::text AS id, title, completed, owner_email, workspace_email").
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

	query, args, err := s.builder.
		Insert("users").
		Columns("email", "password_hash", "password_reset_required").
		Values(normalizedEmail, passwordHash, true).
		ToSql()
	if err != nil {
		return ProvisionedUser{}, err
	}

	if _, err := s.db.ExecContext(ctx, query, args...); err != nil {
		return ProvisionedUser{}, err
	}

	return ProvisionedUser{
		Email:    normalizedEmail,
		Password: password,
	}, nil
}

func (s *PostgresStore) authorizeWorkspace(ctx context.Context, actorEmail string, workspaceEmail string) error {
	var exists bool
	if err := s.db.GetContext(ctx, &exists, `
		SELECT EXISTS (
			SELECT 1
			FROM users
			WHERE email = $1
			  AND (
				email = $2
				OR EXISTS (
					SELECT 1
					FROM workspace_memberships
					WHERE workspace_email = $1 AND user_email = $2
				)
			  )
		)
	`, workspaceEmail, actorEmail); err != nil {
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
