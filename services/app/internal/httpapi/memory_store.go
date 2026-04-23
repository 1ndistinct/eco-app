package httpapi

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"sync"
)

const defaultWorkspaceName = "Personal"

type memoryUser struct {
	email                 string
	passwordHash          string
	passwordResetRequired bool
}

type memoryWorkspace struct {
	id          string
	ownerEmail  string
	name        string
	description string
}

type memoryStore struct {
	mu              sync.Mutex
	nextTodoID      int
	nextWorkspaceID int
	users           map[string]memoryUser
	workspaces      map[string]memoryWorkspace
	sessions        map[string]string
	shares          map[string]map[string]bool
	todos           []Todo
}

func newMemoryStore() *memoryStore {
	return &memoryStore{
		nextTodoID:      1,
		nextWorkspaceID: 1,
		users:           map[string]memoryUser{},
		workspaces:      map[string]memoryWorkspace{},
		sessions:        map[string]string{},
		shares:          map[string]map[string]bool{},
	}
}

func (s *memoryStore) addUser(email string, password string, passwordResetRequired bool) (SessionUser, error) {
	normalizedEmail := normalizeEmail(email)
	if err := validateEmail(normalizedEmail); err != nil {
		return SessionUser{}, err
	}

	passwordHash, err := hashPassword(password)
	if err != nil {
		return SessionUser{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[normalizedEmail]; exists {
		return SessionUser{}, ErrUserAlreadyExists
	}

	user := memoryUser{
		email:                 normalizedEmail,
		passwordHash:          passwordHash,
		passwordResetRequired: passwordResetRequired,
	}
	s.users[normalizedEmail] = user
	s.createWorkspaceLocked(normalizedEmail, defaultWorkspaceName, "Default workspace")

	return SessionUser{
		Email:                 user.email,
		PasswordResetRequired: user.passwordResetRequired,
	}, nil
}

func (s *memoryStore) AuthenticateUser(_ context.Context, email string, password string) (SessionUser, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[normalizeEmail(email)]
	if !exists {
		return SessionUser{}, ErrInvalidCredentials
	}
	if err := comparePassword(user.passwordHash, password); err != nil {
		return SessionUser{}, ErrInvalidCredentials
	}

	return SessionUser{
		Email:                 user.email,
		PasswordResetRequired: user.passwordResetRequired,
	}, nil
}

func (s *memoryStore) AuthenticateGoogleUser(_ context.Context, email string) (SessionUser, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[normalizeEmail(email)]
	if !exists {
		return SessionUser{}, ErrUserNotFound
	}

	return SessionUser{
		Email:                 user.email,
		PasswordResetRequired: user.passwordResetRequired,
	}, nil
}

func (s *memoryStore) ResetPassword(_ context.Context, email string, currentPassword string, newPassword string) (SessionUser, error) {
	if err := validatePassword(newPassword); err != nil {
		return SessionUser{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[normalizeEmail(email)]
	if !exists {
		return SessionUser{}, ErrUserNotFound
	}
	if err := comparePassword(user.passwordHash, currentPassword); err != nil {
		return SessionUser{}, ErrInvalidCredentials
	}

	passwordHash, err := hashPassword(newPassword)
	if err != nil {
		return SessionUser{}, err
	}

	user.passwordHash = passwordHash
	user.passwordResetRequired = false
	s.users[user.email] = user

	return SessionUser{
		Email:                 user.email,
		PasswordResetRequired: false,
	}, nil
}

func (s *memoryStore) CompletePasswordReset(_ context.Context, email string, newPassword string) (SessionUser, error) {
	if err := validatePassword(newPassword); err != nil {
		return SessionUser{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[normalizeEmail(email)]
	if !exists {
		return SessionUser{}, ErrUserNotFound
	}

	passwordHash, err := hashPassword(newPassword)
	if err != nil {
		return SessionUser{}, err
	}

	user.passwordHash = passwordHash
	user.passwordResetRequired = false
	s.users[user.email] = user

	return SessionUser{
		Email:                 user.email,
		PasswordResetRequired: false,
	}, nil
}

func (s *memoryStore) CreateSession(_ context.Context, email string) (string, error) {
	token, err := generateSecretString(24)
	if err != nil {
		return "", err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[token] = normalizeEmail(email)

	return token, nil
}

func (s *memoryStore) GetSession(_ context.Context, token string) (SessionUser, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email, exists := s.sessions[token]
	if !exists {
		return SessionUser{}, ErrSessionNotFound
	}

	user, exists := s.users[email]
	if !exists {
		delete(s.sessions, token)
		return SessionUser{}, ErrSessionNotFound
	}

	return SessionUser{
		Email:                 user.email,
		PasswordResetRequired: user.passwordResetRequired,
	}, nil
}

func (s *memoryStore) DeleteSession(_ context.Context, token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, token)
	return nil
}

func (s *memoryStore) ListAccessibleWorkspaces(_ context.Context, userEmail string) ([]WorkspaceAccess, error) {
	normalizedUserEmail := normalizeEmail(userEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[normalizedUserEmail]; !exists {
		return nil, ErrUserNotFound
	}

	workspaces := make([]WorkspaceAccess, 0)
	for _, workspace := range s.workspaces {
		role := ""
		switch {
		case workspace.ownerEmail == normalizedUserEmail:
			role = "owner"
		case s.shares[workspace.id][normalizedUserEmail]:
			role = "collaborator"
		default:
			continue
		}

		workspaces = append(workspaces, WorkspaceAccess{
			ID:          workspace.id,
			Name:        workspace.name,
			Description: workspace.description,
			OwnerEmail:  workspace.ownerEmail,
			Role:        role,
		})
	}

	sortWorkspaces(workspaces)
	return workspaces, nil
}

func (s *memoryStore) CreateWorkspace(_ context.Context, ownerEmail string, name string, description string) (WorkspaceAccess, error) {
	normalizedOwnerEmail := normalizeEmail(ownerEmail)
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return WorkspaceAccess{}, ErrWorkspaceNameRequired
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[normalizedOwnerEmail]; !exists {
		return WorkspaceAccess{}, ErrUserNotFound
	}

	workspace := s.createWorkspaceLocked(normalizedOwnerEmail, trimmedName, strings.TrimSpace(description))
	return WorkspaceAccess{
		ID:          workspace.id,
		Name:        workspace.name,
		Description: workspace.description,
		OwnerEmail:  workspace.ownerEmail,
		Role:        "owner",
	}, nil
}

func (s *memoryStore) DeleteWorkspace(_ context.Context, actorEmail string, workspaceID string) error {
	normalizedActorEmail := normalizeEmail(actorEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	workspace, exists := s.workspaces[workspaceID]
	if !exists {
		return ErrWorkspaceNotFound
	}
	if workspace.ownerEmail != normalizedActorEmail {
		return ErrWorkspaceAccessDenied
	}

	delete(s.workspaces, workspaceID)
	delete(s.shares, workspaceID)

	filteredTodos := s.todos[:0]
	for _, todo := range s.todos {
		if todo.WorkspaceID != workspaceID {
			filteredTodos = append(filteredTodos, todo)
		}
	}
	s.todos = filteredTodos

	return nil
}

func (s *memoryStore) ListWorkspaceShares(_ context.Context, actorEmail string, workspaceID string) ([]WorkspaceShare, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.hasAccessLocked(normalizedActorEmail, workspaceID) {
		return nil, ErrWorkspaceAccessDenied
	}

	var shares []WorkspaceShare
	for email := range s.shares[workspaceID] {
		shares = append(shares, WorkspaceShare{
			WorkspaceID: workspaceID,
			Email:       email,
		})
	}

	sort.Slice(shares, func(i, j int) bool {
		return shares[i].Email < shares[j].Email
	})

	if shares == nil {
		return []WorkspaceShare{}, nil
	}

	return shares, nil
}

func (s *memoryStore) CreateWorkspaceShare(_ context.Context, actorEmail string, workspaceID string, shareWithEmail string) (WorkspaceShare, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedShareWithEmail := normalizeEmail(shareWithEmail)

	if normalizedShareWithEmail == "" {
		return WorkspaceShare{}, ErrShareTargetRequired
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	workspace, exists := s.workspaces[workspaceID]
	if !exists {
		return WorkspaceShare{}, ErrWorkspaceAccessDenied
	}
	if normalizedShareWithEmail == workspace.ownerEmail {
		return WorkspaceShare{}, ErrCannotShareWithOwner
	}
	if !s.hasAccessLocked(normalizedActorEmail, workspaceID) {
		return WorkspaceShare{}, ErrWorkspaceAccessDenied
	}
	if _, exists := s.users[normalizedShareWithEmail]; !exists {
		return WorkspaceShare{}, ErrUserNotFound
	}
	if s.shares[workspaceID] == nil {
		s.shares[workspaceID] = map[string]bool{}
	}
	s.shares[workspaceID][normalizedShareWithEmail] = true

	return WorkspaceShare{
		WorkspaceID: workspaceID,
		Email:       normalizedShareWithEmail,
	}, nil
}

func (s *memoryStore) ListTodos(_ context.Context, actorEmail string, workspaceID string) ([]Todo, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.hasAccessLocked(normalizedActorEmail, workspaceID) {
		return nil, ErrWorkspaceAccessDenied
	}

	items := make([]Todo, 0)
	for _, todo := range s.todos {
		if todo.WorkspaceID == workspaceID {
			items = append(items, todo)
		}
	}

	return items, nil
}

func (s *memoryStore) CreateTodo(_ context.Context, actorEmail string, workspaceID string, title string) (Todo, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	workspace, exists := s.workspaces[workspaceID]
	if !exists || !s.hasAccessLocked(normalizedActorEmail, workspaceID) {
		return Todo{}, ErrWorkspaceAccessDenied
	}

	todo := Todo{
		ID:          strconv.Itoa(s.nextTodoID),
		Title:       title,
		Completed:   false,
		OwnerEmail:  normalizedActorEmail,
		WorkspaceID: workspace.id,
	}
	s.nextTodoID++
	s.todos = append(s.todos, todo)

	return todo, nil
}

func (s *memoryStore) UpdateCompleted(_ context.Context, actorEmail string, id string, completed bool) (Todo, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	for index, todo := range s.todos {
		if todo.ID != id {
			continue
		}
		if !s.hasAccessLocked(normalizedActorEmail, todo.WorkspaceID) {
			return Todo{}, ErrWorkspaceAccessDenied
		}

		todo.Completed = completed
		s.todos[index] = todo
		return todo, nil
	}

	return Todo{}, ErrTodoNotFound
}

func (s *memoryStore) DeleteTodo(_ context.Context, actorEmail string, id string) error {
	normalizedActorEmail := normalizeEmail(actorEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	for index, todo := range s.todos {
		if todo.ID != id {
			continue
		}
		if !s.hasAccessLocked(normalizedActorEmail, todo.WorkspaceID) {
			return ErrWorkspaceAccessDenied
		}

		s.todos = append(s.todos[:index], s.todos[index+1:]...)
		return nil
	}

	return ErrTodoNotFound
}

func (s *memoryStore) ProvisionUser(_ context.Context, email string) (ProvisionedUser, error) {
	password, err := generateProvisionedPassword()
	if err != nil {
		return ProvisionedUser{}, err
	}

	user, err := s.addUser(email, password, true)
	if err != nil {
		return ProvisionedUser{}, err
	}

	return ProvisionedUser{
		Email:    user.Email,
		Password: password,
	}, nil
}

func (s *memoryStore) createWorkspaceLocked(ownerEmail string, name string, description string) memoryWorkspace {
	workspace := memoryWorkspace{
		id:          strconv.Itoa(s.nextWorkspaceID),
		ownerEmail:  ownerEmail,
		name:        name,
		description: description,
	}
	s.nextWorkspaceID++
	s.workspaces[workspace.id] = workspace
	return workspace
}

func (s *memoryStore) hasAccessLocked(actorEmail string, workspaceID string) bool {
	workspace, exists := s.workspaces[workspaceID]
	if !exists {
		return false
	}
	if workspace.ownerEmail == actorEmail {
		return true
	}

	return s.shares[workspaceID][actorEmail]
}

func sortWorkspaces(workspaces []WorkspaceAccess) {
	sort.Slice(workspaces, func(i, j int) bool {
		if workspaces[i].Role != workspaces[j].Role {
			return workspaces[i].Role == "owner"
		}
		if workspaces[i].OwnerEmail != workspaces[j].OwnerEmail {
			return workspaces[i].OwnerEmail < workspaces[j].OwnerEmail
		}
		if workspaces[i].Name != workspaces[j].Name {
			return workspaces[i].Name < workspaces[j].Name
		}
		return workspaces[i].ID < workspaces[j].ID
	})
}
