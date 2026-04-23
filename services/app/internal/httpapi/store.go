package httpapi

import (
	"context"
	"errors"
)

type Todo struct {
	ID          string `json:"id" db:"id"`
	Title       string `json:"title" db:"title"`
	Completed   bool   `json:"completed" db:"completed"`
	OwnerEmail  string `json:"ownerEmail" db:"owner_email"`
	WorkspaceID string `json:"workspaceId" db:"workspace_id"`
}

type SessionUser struct {
	Email                 string `json:"email" db:"email"`
	PasswordResetRequired bool   `json:"passwordResetRequired" db:"password_reset_required"`
}

type WorkspaceAccess struct {
	ID          string `json:"id" db:"id"`
	Name        string `json:"name" db:"name"`
	Description string `json:"description" db:"description"`
	OwnerEmail  string `json:"ownerEmail" db:"owner_email"`
	Role        string `json:"role" db:"role"`
}

type WorkspaceShare struct {
	WorkspaceID string `json:"workspaceId" db:"workspace_id"`
	Email       string `json:"email" db:"email"`
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
	CompletePasswordReset(ctx context.Context, email string, newPassword string) (SessionUser, error)
	CreateSession(ctx context.Context, email string) (string, error)
	GetSession(ctx context.Context, token string) (SessionUser, error)
	DeleteSession(ctx context.Context, token string) error
	ListAccessibleWorkspaces(ctx context.Context, userEmail string) ([]WorkspaceAccess, error)
	CreateWorkspace(ctx context.Context, ownerEmail string, name string, description string) (WorkspaceAccess, error)
	DeleteWorkspace(ctx context.Context, actorEmail string, workspaceID string) error
	ListWorkspaceShares(ctx context.Context, actorEmail string, workspaceID string) ([]WorkspaceShare, error)
	CreateWorkspaceShare(ctx context.Context, actorEmail string, workspaceID string, shareWithEmail string) (WorkspaceShare, error)
	DeleteWorkspaceShare(ctx context.Context, actorEmail string, workspaceID string, shareWithEmail string) error
	ListTodos(ctx context.Context, actorEmail string, workspaceID string) ([]Todo, error)
	CreateTodo(ctx context.Context, actorEmail string, workspaceID string, title string) (Todo, error)
	UpdateCompleted(ctx context.Context, actorEmail string, id string, completed bool) (Todo, error)
	DeleteTodo(ctx context.Context, actorEmail string, id string) error
	ProvisionUser(ctx context.Context, email string) (ProvisionedUser, error)
}

var (
	ErrTodoNotFound          = errors.New("todo not found")
	ErrInvalidCredentials    = errors.New("invalid credentials")
	ErrSessionNotFound       = errors.New("session not found")
	ErrWorkspaceNotFound     = errors.New("workspace not found")
	ErrWorkspaceAccessDenied = errors.New("workspace access denied")
	ErrUserNotFound          = errors.New("user not found")
	ErrUserAlreadyExists     = errors.New("user already exists")
	ErrInvalidEmail          = errors.New("valid email is required")
	ErrPasswordTooShort      = errors.New("password must be at least 12 characters")
	ErrWorkspaceNameRequired = errors.New("workspace name is required")
	ErrShareTargetRequired   = errors.New("share email is required")
	ErrCannotShareWithOwner  = errors.New("cannot share a workspace with its owner")
	ErrCannotRemoveOwner     = errors.New("cannot remove the owner from a workspace")
	ErrPasswordResetRequired = errors.New("password reset required")
)
