package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

type createTodoRequest struct {
	Title       string `json:"title"`
	WorkspaceID string `json:"workspaceId"`
}

type updateTodoRequest struct {
	Title     *string `json:"title"`
	Completed *bool   `json:"completed"`
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
	WorkspaceID string `json:"workspaceId"`
	Email       string `json:"email"`
}

type createWorkspaceRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type errorResponse struct {
	Error string `json:"error"`
}

type todoListResponse struct {
	Items       []Todo `json:"items"`
	WorkspaceID string `json:"workspaceId"`
}

type shareListResponse struct {
	Items       []WorkspaceShare `json:"items"`
	WorkspaceID string           `json:"workspaceId"`
}

type handler struct {
	store      AppStore
	googleAuth GoogleAuthConfig
	todoEvents *TodoEventBroker
}

type HandlerOptions struct {
	GoogleAuth GoogleAuthConfig
	TodoEvents *TodoEventBroker
}

func NewHandler(store AppStore, options ...HandlerOptions) http.Handler {
	return newHandler(store, true, true, options...)
}

func NewShellHandler(store AppStore, options ...HandlerOptions) http.Handler {
	return newHandler(store, true, false, options...)
}

func NewTodoHandler(store AppStore, options ...HandlerOptions) http.Handler {
	return newHandler(store, false, true, options...)
}

func newHandler(
	store AppStore,
	includeShellRoutes bool,
	includeTodoRoutes bool,
	options ...HandlerOptions,
) http.Handler {
	var resolved HandlerOptions
	if len(options) > 0 {
		resolved = options[0]
	}

	h := &handler{
		store:      store,
		googleAuth: resolved.GoogleAuth,
		todoEvents: resolved.TodoEvents,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthzHandler)
	mux.HandleFunc("/api/healthz", healthzHandler)
	if includeShellRoutes {
		mux.HandleFunc("/api/auth/session", h.handleSession)
		mux.HandleFunc("/api/auth/login", h.handleLogin)
		mux.HandleFunc("/api/auth/google/start", h.handleGoogleLoginStart)
		mux.HandleFunc("/api/auth/google/callback", h.handleGoogleLoginCallback)
		mux.HandleFunc("/api/auth/logout", h.handleLogout)
		mux.HandleFunc("/api/auth/reset-password", h.handleResetPassword)
		mux.HandleFunc("/api/workspaces", h.handleWorkspaces)
		mux.HandleFunc("/api/workspaces/", h.handleWorkspace)
		mux.HandleFunc("/api/shares", h.handleShares)
	}
	if includeTodoRoutes {
		mux.HandleFunc("/api/todos", h.handleTodos)
		mux.HandleFunc("/api/todos/stream", h.handleTodoStream)
		mux.HandleFunc("/api/todos/", h.handleTodo)
	}
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
		http.SetCookie(w, clearSessionCookie(h.googleAuth.SecureCookies(r)))
		writeJSON(w, http.StatusOK, h.unauthenticatedSessionState())
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusOK, h.unauthenticatedSessionState())
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

	http.SetCookie(w, newSessionCookie(token, h.googleAuth.SecureCookies(r)))

	state, err := h.buildSessionState(r.Context(), user)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, state)
}

func (h *handler) handleGoogleLoginStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	if !h.googleAuth.Enabled() {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_unavailable"), http.StatusSeeOther)
		return
	}

	state, err := generateSecretString(24)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	secureCookies := h.googleAuth.SecureCookies(r)
	http.SetCookie(w, newGoogleStateCookie(state, secureCookies))

	redirectURL := h.googleAuth.OAuth2Config(r).AuthCodeURL(
		state,
		oauth2.AccessTypeOnline,
		oauth2.SetAuthURLParam("prompt", "select_account"),
	)
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

func (h *handler) handleGoogleLoginCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	if !h.googleAuth.Enabled() {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_unavailable"), http.StatusSeeOther)
		return
	}

	if authError := strings.TrimSpace(r.URL.Query().Get("error")); authError != "" {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_cancelled"), http.StatusSeeOther)
		return
	}

	secureCookies := h.googleAuth.SecureCookies(r)
	defer http.SetCookie(w, clearGoogleStateCookie(secureCookies))

	stateCookie, err := r.Cookie(googleStateCookieName)
	if err != nil || strings.TrimSpace(stateCookie.Value) == "" {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_expired"), http.StatusSeeOther)
		return
	}

	state := strings.TrimSpace(r.URL.Query().Get("state"))
	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if state == "" || code == "" || state != stateCookie.Value {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_expired"), http.StatusSeeOther)
		return
	}

	oauthConfig := h.googleAuth.OAuth2Config(r)
	token, err := oauthConfig.Exchange(r.Context(), code)
	if err != nil {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_failed"), http.StatusSeeOther)
		return
	}

	client := oauthConfig.Client(r.Context(), token)
	userInfoResponse, err := client.Get(h.googleAuth.UserInfoURL())
	if err != nil {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_failed"), http.StatusSeeOther)
		return
	}
	defer userInfoResponse.Body.Close()

	if userInfoResponse.StatusCode != http.StatusOK {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_failed"), http.StatusSeeOther)
		return
	}

	var userInfo googleUserInfo
	if err := json.NewDecoder(userInfoResponse.Body).Decode(&userInfo); err != nil {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_failed"), http.StatusSeeOther)
		return
	}

	if !userInfo.EmailVerified || strings.TrimSpace(userInfo.Email) == "" {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_email_not_verified"), http.StatusSeeOther)
		return
	}
	if !isSupportedGoogleLoginEmail(userInfo.Email) {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_email_not_supported"), http.StatusSeeOther)
		return
	}

	user, err := h.store.AuthenticateGoogleUser(r.Context(), userInfo.Email)
	if errors.Is(err, ErrUserNotFound) {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_account_not_allowed"), http.StatusSeeOther)
		return
	}
	if err != nil {
		http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, "google_login_failed"), http.StatusSeeOther)
		return
	}

	sessionToken, err := h.store.CreateSession(r.Context(), user.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	http.SetCookie(w, newSessionCookie(sessionToken, h.googleAuth.SecureCookies(r)))
	http.Redirect(w, r, h.googleAuth.RedirectHomeURL(r, ""), http.StatusSeeOther)
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

	http.SetCookie(w, clearSessionCookie(h.googleAuth.SecureCookies(r)))
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
	if err := validatePassword(req.NewPassword); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}

	var updatedUser SessionUser
	var err error
	if user.PasswordResetRequired {
		updatedUser, err = h.store.CompletePasswordReset(r.Context(), user.Email, req.NewPassword)
	} else {
		if strings.TrimSpace(req.CurrentPassword) == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "current password is required"})
			return
		}
		updatedUser, err = h.store.ResetPassword(r.Context(), user.Email, req.CurrentPassword, req.NewPassword)
	}
	if errors.Is(err, ErrInvalidCredentials) {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid credentials"})
		return
	}
	if errors.Is(err, ErrUserNotFound) {
		http.SetCookie(w, clearSessionCookie(h.googleAuth.SecureCookies(r)))
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

func (h *handler) handleWorkspaces(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireReadySession(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodPost:
		var req createWorkspaceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
			return
		}

		workspace, err := h.store.CreateWorkspace(r.Context(), user.Email, req.Name, req.Description)
		if errors.Is(err, ErrWorkspaceNameRequired) {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}

		writeJSON(w, http.StatusCreated, workspace)
	default:
		w.Header().Set("Allow", "POST")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

func (h *handler) handleWorkspace(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireReadySession(w, r)
	if !ok {
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	if id == "" || strings.Contains(id, "/") {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "workspace not found"})
		return
	}

	switch r.Method {
	case http.MethodDelete:
		err := h.store.DeleteWorkspace(r.Context(), user.Email, id)
		if errors.Is(err, ErrWorkspaceNotFound) {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "workspace not found"})
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

		w.WriteHeader(http.StatusNoContent)
	default:
		w.Header().Set("Allow", "DELETE")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

func (h *handler) handleTodos(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireReadySession(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		workspaceID, err := h.workspaceFromQuery(r.Context(), r, user.Email)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		items, err := h.store.ListTodos(r.Context(), user.Email, workspaceID)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		writeJSON(w, http.StatusOK, todoListResponse{
			Items:       items,
			WorkspaceID: workspaceID,
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

		workspaceID, err := h.workspaceFromBody(r.Context(), req.WorkspaceID, user.Email)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		todo, err := h.store.CreateTodo(r.Context(), user.Email, workspaceID, title)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		h.publishTodoEvent(r.Context(), TodoEvent{
			Type:        TodoEventTypeCreated,
			WorkspaceID: todo.WorkspaceID,
			TodoID:      todo.ID,
		})
		writeJSON(w, http.StatusCreated, todo)
	default:
		w.Header().Set("Allow", "GET, POST")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

func (h *handler) handleTodoStream(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	user, ok := h.requireReadySession(w, r)
	if !ok {
		return
	}

	if h.todoEvents == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "todo event stream unavailable"})
		return
	}

	workspaceID, err := h.workspaceFromQuery(r.Context(), r, user.Email)
	if errors.Is(err, ErrWorkspaceAccessDenied) {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}
	if err := h.ensureWorkspaceAccess(r.Context(), user.Email, workspaceID); errors.Is(err, ErrWorkspaceAccessDenied) {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
		return
	} else if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "streaming unsupported"})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	if _, err := w.Write([]byte(": connected\n\n")); err != nil {
		return
	}
	flusher.Flush()

	events, unsubscribe := h.todoEvents.Subscribe(workspaceID)
	defer unsubscribe()

	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case event, ok := <-events:
			if !ok {
				return
			}
			if err := writeSSEEvent(w, event); err != nil {
				return
			}
			flusher.Flush()
		case <-heartbeat.C:
			if _, err := w.Write([]byte(": keepalive\n\n")); err != nil {
				return
			}
			flusher.Flush()
		}
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

	switch r.Method {
	case http.MethodPatch:
		var req updateTodoRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
			return
		}
		if req.Title == nil && req.Completed == nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "title or completed is required"})
			return
		}

		var title *string
		if req.Title != nil {
			trimmedTitle := strings.TrimSpace(*req.Title)
			if trimmedTitle == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "title is required"})
				return
			}

			title = &trimmedTitle
		}

		todo, err := h.store.UpdateTodo(r.Context(), user.Email, id, title, req.Completed)
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
		h.publishTodoEvent(r.Context(), TodoEvent{
			Type:        TodoEventTypeUpdated,
			WorkspaceID: todo.WorkspaceID,
			TodoID:      todo.ID,
		})

		writeJSON(w, http.StatusOK, todo)
	case http.MethodDelete:
		deletedTodo, err := h.store.DeleteTodo(r.Context(), user.Email, id)
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
		h.publishTodoEvent(r.Context(), TodoEvent{
			Type:        TodoEventTypeDeleted,
			WorkspaceID: deletedTodo.WorkspaceID,
			TodoID:      deletedTodo.ID,
		})

		w.WriteHeader(http.StatusNoContent)
	default:
		w.Header().Set("Allow", "PATCH, DELETE")
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

func (h *handler) handleShares(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireReadySession(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		workspaceID, err := h.workspaceFromQuery(r.Context(), r, user.Email)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		items, err := h.store.ListWorkspaceShares(r.Context(), user.Email, workspaceID)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}

		writeJSON(w, http.StatusOK, shareListResponse{
			Items:       items,
			WorkspaceID: workspaceID,
		})
	case http.MethodPost:
		var req createShareRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
			return
		}

		workspaceID, err := h.workspaceFromBody(r.Context(), req.WorkspaceID, user.Email)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		share, err := h.store.CreateWorkspaceShare(r.Context(), user.Email, workspaceID, req.Email)
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
	case http.MethodDelete:
		var req createShareRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
			return
		}

		workspaceID, err := h.workspaceFromBody(r.Context(), req.WorkspaceID, user.Email)
		if errors.Is(err, ErrWorkspaceAccessDenied) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
			return
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}
		if err := h.store.DeleteWorkspaceShare(r.Context(), user.Email, workspaceID, req.Email); err != nil {
			if errors.Is(err, ErrWorkspaceAccessDenied) {
				writeJSON(w, http.StatusForbidden, errorResponse{Error: "workspace access denied"})
				return
			}
			if errors.Is(err, ErrShareTargetRequired) || errors.Is(err, ErrCannotRemoveOwner) {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
				return
			}
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			return
		}

		w.WriteHeader(http.StatusNoContent)
	default:
		w.Header().Set("Allow", "GET, POST, DELETE")
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
		http.SetCookie(w, clearSessionCookie(h.googleAuth.SecureCookies(r)))
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
		GoogleLoginEnabled:   h.googleAuth.Enabled(),
		GoogleLoginURL:       h.googleAuth.LoginURL(),
		User:                 &user,
		AccessibleWorkspaces: workspaces,
	}, nil
}

func (h *handler) unauthenticatedSessionState() SessionState {
	return SessionState{
		Authenticated:      false,
		GoogleLoginEnabled: h.googleAuth.Enabled(),
		GoogleLoginURL:     h.googleAuth.LoginURL(),
	}
}

func (h *handler) workspaceFromQuery(ctx context.Context, r *http.Request, fallbackUserEmail string) (string, error) {
	return h.workspaceFromBody(ctx, r.URL.Query().Get("workspace"), fallbackUserEmail)
}

func (h *handler) workspaceFromBody(ctx context.Context, value string, fallbackUserEmail string) (string, error) {
	normalizedValue := strings.TrimSpace(value)
	if normalizedValue != "" {
		return normalizedValue, nil
	}

	workspaces, err := h.store.ListAccessibleWorkspaces(ctx, fallbackUserEmail)
	if err != nil {
		return "", err
	}
	if len(workspaces) == 0 {
		return "", ErrWorkspaceAccessDenied
	}

	return workspaces[0].ID, nil
}

func (h *handler) ensureWorkspaceAccess(ctx context.Context, userEmail string, workspaceID string) error {
	if strings.TrimSpace(workspaceID) == "" {
		return ErrWorkspaceAccessDenied
	}

	workspaces, err := h.store.ListAccessibleWorkspaces(ctx, userEmail)
	if err != nil {
		return err
	}
	for _, workspace := range workspaces {
		if workspace.ID == workspaceID {
			return nil
		}
	}

	return ErrWorkspaceAccessDenied
}

func (h *handler) publishTodoEvent(ctx context.Context, event TodoEvent) {
	if h.todoEvents == nil {
		return
	}

	if err := h.todoEvents.Publish(ctx, event); err != nil {
		log.Printf("todo events: publish %s for workspace %s todo %s: %v", event.Type, event.WorkspaceID, event.TodoID, err)
	}
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

func writeSSEEvent(w http.ResponseWriter, event TodoEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}

	if _, err := w.Write([]byte("data: ")); err != nil {
		return err
	}
	if _, err := w.Write(payload); err != nil {
		return err
	}
	if _, err := w.Write([]byte("\n\n")); err != nil {
		return err
	}

	return nil
}
