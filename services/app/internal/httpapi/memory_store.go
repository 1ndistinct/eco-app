package httpapi

import (
	"context"
	"sort"
	"strconv"
	"sync"
)

type memoryUser struct {
	email                 string
	passwordHash          string
	passwordResetRequired bool
}

type memoryStore struct {
	mu       sync.Mutex
	nextID   int
	users    map[string]memoryUser
	sessions map[string]string
	shares   map[string]map[string]bool
	todos    []Todo
}

func newMemoryStore() *memoryStore {
	return &memoryStore{
		nextID:   1,
		users:    map[string]memoryUser{},
		sessions: map[string]string{},
		shares:   map[string]map[string]bool{},
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

	workspaces := []WorkspaceAccess{{
		OwnerEmail: normalizedUserEmail,
		Role:       "owner",
	}}

	for workspaceEmail, members := range s.shares {
		if members[normalizedUserEmail] {
			workspaces = append(workspaces, WorkspaceAccess{
				OwnerEmail: workspaceEmail,
				Role:       "collaborator",
			})
		}
	}

	sort.Slice(workspaces, func(i, j int) bool {
		return workspaces[i].OwnerEmail < workspaces[j].OwnerEmail
	})

	return workspaces, nil
}

func (s *memoryStore) ListWorkspaceShares(_ context.Context, actorEmail string, workspaceEmail string) ([]WorkspaceShare, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedWorkspaceEmail := normalizeEmail(workspaceEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.hasAccessLocked(normalizedActorEmail, normalizedWorkspaceEmail) {
		return nil, ErrWorkspaceAccessDenied
	}

	var shares []WorkspaceShare
	for email := range s.shares[normalizedWorkspaceEmail] {
		shares = append(shares, WorkspaceShare{
			WorkspaceEmail: normalizedWorkspaceEmail,
			Email:          email,
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

func (s *memoryStore) CreateWorkspaceShare(_ context.Context, actorEmail string, workspaceEmail string, shareWithEmail string) (WorkspaceShare, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedWorkspaceEmail := normalizeEmail(workspaceEmail)
	normalizedShareWithEmail := normalizeEmail(shareWithEmail)

	if normalizedShareWithEmail == "" {
		return WorkspaceShare{}, ErrShareTargetRequired
	}
	if normalizedShareWithEmail == normalizedWorkspaceEmail {
		return WorkspaceShare{}, ErrCannotShareWithOwner
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.hasAccessLocked(normalizedActorEmail, normalizedWorkspaceEmail) {
		return WorkspaceShare{}, ErrWorkspaceAccessDenied
	}
	if _, exists := s.users[normalizedShareWithEmail]; !exists {
		return WorkspaceShare{}, ErrUserNotFound
	}
	if s.shares[normalizedWorkspaceEmail] == nil {
		s.shares[normalizedWorkspaceEmail] = map[string]bool{}
	}
	s.shares[normalizedWorkspaceEmail][normalizedShareWithEmail] = true

	return WorkspaceShare{
		WorkspaceEmail: normalizedWorkspaceEmail,
		Email:          normalizedShareWithEmail,
	}, nil
}

func (s *memoryStore) ListTodos(_ context.Context, actorEmail string, workspaceEmail string) ([]Todo, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedWorkspaceEmail := normalizeEmail(workspaceEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.hasAccessLocked(normalizedActorEmail, normalizedWorkspaceEmail) {
		return nil, ErrWorkspaceAccessDenied
	}

	items := make([]Todo, 0)
	for _, todo := range s.todos {
		if todo.WorkspaceEmail == normalizedWorkspaceEmail {
			items = append(items, todo)
		}
	}

	if items == nil {
		return []Todo{}, nil
	}

	return items, nil
}

func (s *memoryStore) CreateTodo(_ context.Context, actorEmail string, workspaceEmail string, title string) (Todo, error) {
	normalizedActorEmail := normalizeEmail(actorEmail)
	normalizedWorkspaceEmail := normalizeEmail(workspaceEmail)

	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.hasAccessLocked(normalizedActorEmail, normalizedWorkspaceEmail) {
		return Todo{}, ErrWorkspaceAccessDenied
	}

	todo := Todo{
		ID:             strconv.Itoa(s.nextID),
		Title:          title,
		Completed:      false,
		OwnerEmail:     normalizedActorEmail,
		WorkspaceEmail: normalizedWorkspaceEmail,
	}
	s.nextID++
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
		if !s.hasAccessLocked(normalizedActorEmail, todo.WorkspaceEmail) {
			return Todo{}, ErrWorkspaceAccessDenied
		}

		todo.Completed = completed
		s.todos[index] = todo
		return todo, nil
	}

	return Todo{}, ErrTodoNotFound
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

func (s *memoryStore) hasAccessLocked(actorEmail string, workspaceEmail string) bool {
	if actorEmail == workspaceEmail {
		return true
	}

	return s.shares[workspaceEmail][actorEmail]
}
