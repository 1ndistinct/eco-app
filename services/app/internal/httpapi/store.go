package httpapi

import (
	"context"
	"errors"
)

type Todo struct {
	ID             string `json:"id" db:"id"`
	Title          string `json:"title" db:"title"`
	Completed      bool   `json:"completed" db:"completed"`
	OwnerEmail     string `json:"ownerEmail" db:"owner_email"`
	WorkspaceEmail string `json:"workspaceEmail" db:"workspace_email"`
}

type SessionUser struct {
	Email                 string `json:"email" db:"email"`
	PasswordResetRequired bool   `json:"passwordResetRequired" db:"password_reset_required"`
}

type WorkspaceAccess struct {
	OwnerEmail string `json:"ownerEmail" db:"owner_email"`
	Role       string `json:"role" db:"role"`
}

type WorkspaceShare struct {
	WorkspaceEmail string `json:"workspaceEmail" db:"workspace_email"`
	Email          string `json:"email" db:"email"`
}

type ProvisionedUser struct {
	Email    string
	Password string
}

type SessionState struct {
	Authenticated        bool              `json:"authenticated"`
	GoogleLoginEnabled   bool              `json:"googleLoginEnabled,omitempty"`
	GoogleLoginURL       string            `json:"googleLoginURL,omitempty"`
	User                 *SessionUser      `json:"user,omitempty"`
	AccessibleWorkspaces []WorkspaceAccess `json:"accessibleWorkspaces,omitempty"`
}

type AppStore interface {
	AuthenticateUser(ctx context.Context, email string, password string) (SessionUser, error)
	AuthenticateGoogleUser(ctx context.Context, email string) (SessionUser, error)
	ResetPassword(ctx context.Context, email string, currentPassword string, newPassword string) (SessionUser, error)
	CreateSession(ctx context.Context, email string) (string, error)
	GetSession(ctx context.Context, token string) (SessionUser, error)
	DeleteSession(ctx context.Context, token string) error
	ListAccessibleWorkspaces(ctx context.Context, userEmail string) ([]WorkspaceAccess, error)
	ListWorkspaceShares(ctx context.Context, actorEmail string, workspaceEmail string) ([]WorkspaceShare, error)
	CreateWorkspaceShare(ctx context.Context, actorEmail string, workspaceEmail string, shareWithEmail string) (WorkspaceShare, error)
	ListTodos(ctx context.Context, actorEmail string, workspaceEmail string) ([]Todo, error)
	CreateTodo(ctx context.Context, actorEmail string, workspaceEmail string, title string) (Todo, error)
	UpdateCompleted(ctx context.Context, actorEmail string, id string, completed bool) (Todo, error)
	ProvisionUser(ctx context.Context, email string) (ProvisionedUser, error)
}

var (
	ErrTodoNotFound          = errors.New("todo not found")
	ErrInvalidCredentials    = errors.New("invalid credentials")
	ErrSessionNotFound       = errors.New("session not found")
	ErrWorkspaceAccessDenied = errors.New("workspace access denied")
	ErrUserNotFound          = errors.New("user not found")
	ErrUserAlreadyExists     = errors.New("user already exists")
	ErrInvalidEmail          = errors.New("valid email is required")
	ErrPasswordTooShort      = errors.New("password must be at least 12 characters")
	ErrShareTargetRequired   = errors.New("share email is required")
	ErrCannotShareWithOwner  = errors.New("cannot share a workspace with its owner")
	ErrPasswordResetRequired = errors.New("password reset required")
)
