package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type createTodoRequest struct {
	Title          string `json:"title"`
	WorkspaceEmail string `json:"workspaceEmail"`
}

type updateTodoRequest struct {
	Completed *bool `json:"completed"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type resetPasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type createShareRequest struct {
	WorkspaceEmail string `json:"workspaceEmail"`
	Email          string `json:"email"`
}

type errorResponse struct {
	Error string `json:"error"`
}

type todoListResponse struct {
	Items          []Todo `json:"items"`
	WorkspaceEmail string `json:"workspaceEmail"`
}

type shareListResponse struct {
	Items          []WorkspaceShare `json:"items"`
	WorkspaceEmail string           `json:"workspaceEmail"`
}

type handler struct {
	store AppStore
}

func NewHandler(store AppStore) http.Handler {
	h := &handler{store: store}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthzHandler)
	mux.HandleFunc("/api/healthz", healthzHandler)
	mux.HandleFunc("/api/auth/session", h.handleSession)
	mux.HandleFunc("/api/auth/login", h.handleLogin)
	mux.HandleFunc("/api/auth/logout", h.handleLogout)
	mux.HandleFunc("/api/auth/reset-password", h.handleResetPassword)
	mux.HandleFunc("/api/todos", h.handleTodos)
	mux.HandleFunc("/api/todos/", h.handleTodo)
	mux.HandleFunc("/api/shares", h.handleShares)
	return mux
}

func (h *handler) handleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	user, err := h.currentUser(r.Context(), r)
	if errors.Is(err, ErrSessionNotFound) {
		http.SetCookie(w, clearSessionCookie())
		writeJSON(w, http.StatusOK, SessionState{Authenticated: false})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusOK, SessionState{Authenticated: false})
		return
	}

	state, err := h.buildSessionState(r.Context(), *user)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, state)
}

func (h *handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
		return
	}

	if err := validateEmail(req.Email); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}
	if strings.TrimSpace(req.Password) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "password is required"})
		return
	}

	user, err := h.store.AuthenticateUser(r.Context(), req.Email, req.Password)
	if errors.Is(err, ErrInvalidCredentials) {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid credentials"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	token, err := h.store.CreateSession(r.Context(), user.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	http.SetCookie(w, newSessionCookie(token))

	state, err := h.buildSessionState(r.Context(), user)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, state)
}

func (h *handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	if cookie, err := r.Cookie(sessionCookieName); err == nil && strings.TrimSpace(cookie.Value) != "" {
		_ = h.store.DeleteSession(r.Context(), cookie.Value)
	}

	http.SetCookie(w, clearSessionCookie())
	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) handleResetPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	user, ok := h.requireSession(w, r)
	if !ok {
		return
	}

	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
		return
	}
	if strings.TrimSpace(req.CurrentPassword) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "current password is required"})
		return
	}
	if err := validatePassword(req.NewPassword); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}

	updatedUser, err := h.store.ResetPassword(r.Context(), user.Email, req.CurrentPassword, req.NewPassword)
	if errors.Is(err, ErrInvalidCredentials) {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid credentials"})
		return
	}
	if errors.Is(err, ErrUserNotFound) {
		http.SetCookie(w, clearSessionCookie())
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "session expired"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	state, err := h.buildSessionState(r.Context(), updatedUser)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, state)
}

func (h *handler) handleTodos(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireReadySession(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		workspaceEmail := h.workspaceFromQuery(r, user.Email)
		items, err := h.store.ListTodos(r.Context(), user.Email, workspaceEmail)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		writeJSON(w, http.StatusOK, todoListResponse{
			Items:          items,
			WorkspaceEmail: workspaceEmail,
		})
	case http.MethodPost:
		var req createTodoRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
			return
		}

		title := strings.TrimSpace(req.Title)
		if title == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "title is required"})
			return
		}

		workspaceEmail := h.workspaceFromBody(req.WorkspaceEmail, user.Email)
		todo, err := h.store.CreateTodo(r.Context(), user.Email, workspaceEmail, title)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		writeJSON(w, http.StatusCreated, todo)
	default:
		w.Header().Set("Allow", "GET, POST")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

func (h *handler) handleTodo(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireReadySession(w, r)
	if !ok {
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/todos/")
	if id == "" || strings.Contains(id, "/") {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "todo not found"})
		return
	}

	if r.Method != http.MethodPatch {
		w.Header().Set("Allow", "PATCH")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var req updateTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
		return
	}
	if req.Completed == nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "completed is required"})
		return
	}

	todo, err := h.store.UpdateCompleted(r.Context(), user.Email, id, *req.Completed)
	if errors.Is(err, ErrTodoNotFound) {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "todo not found"})
		return
	}
	if errors.Is(err, ErrWorkspaceAccessDenied) {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, todo)
}

func (h *handler) handleShares(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireReadySession(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		workspaceEmail := h.workspaceFromQuery(r, user.Email)
		items, err := h.store.ListWorkspaceShares(r.Context(), user.Email, workspaceEmail)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}

		writeJSON(w, http.StatusOK, shareListResponse{
			Items:          items,
			WorkspaceEmail: workspaceEmail,
		})
	case http.MethodPost:
		var req createShareRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
			return
		}

		workspaceEmail := h.workspaceFromBody(req.WorkspaceEmail, user.Email)
		share, err := h.store.CreateWorkspaceShare(r.Context(), user.Email, workspaceEmail, req.Email)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "user not found"})
			return
		}
		if errors.Is(err, ErrShareTargetRequired) || errors.Is(err, ErrCannotShareWithOwner) {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}

		writeJSON(w, http.StatusCreated, share)
	default:
		w.Header().Set("Allow", "GET, POST")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

func (h *handler) currentUser(ctx context.Context, r *http.Request) (*SessionUser, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err == http.ErrNoCookie {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(cookie.Value) == "" {
		return nil, nil
	}

	user, err := h.store.GetSession(ctx, cookie.Value)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (h *handler) requireSession(w http.ResponseWriter, r *http.Request) (SessionUser, bool) {
	user, err := h.currentUser(r.Context(), r)
	if errors.Is(err, ErrSessionNotFound) {
		http.SetCookie(w, clearSessionCookie())
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "session expired"})
		return SessionUser{}, false
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return SessionUser{}, false
	}
	if user == nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "authentication required"})
		return SessionUser{}, false
	}

	return *user, true
}

func (h *handler) requireReadySession(w http.ResponseWriter, r *http.Request) (SessionUser, bool) {
	user, ok := h.requireSession(w, r)
	if !ok {
		return SessionUser{}, false
	}
	if user.PasswordResetRequired {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: ErrPasswordResetRequired.Error()})
		return SessionUser{}, false
	}

	return user, true
}

func (h *handler) buildSessionState(ctx context.Context, user SessionUser) (SessionState, error) {
	workspaces, err := h.store.ListAccessibleWorkspaces(ctx, user.Email)
	if err != nil {
		return SessionState{}, err
	}

	return SessionState{
		Authenticated:        true,
		User:                 &user,
		AccessibleWorkspaces: workspaces,
	}, nil
}

func (h *handler) workspaceFromQuery(r *http.Request, fallback string) string {
	return h.workspaceFromBody(r.URL.Query().Get("workspace"), fallback)
}

func (h *handler) workspaceFromBody(value string, fallback string) string {
	normalizedValue := normalizeEmail(value)
	if normalizedValue == "" {
		return normalizeEmail(fallback)
	}

	return normalizedValue
}

func healthzHandler(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
