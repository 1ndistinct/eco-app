package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestHandlerHealthz(t *testing.T) {
	handler := NewHandler(newMemoryStore())

	for _, path := range []string{"/healthz", "/api/healthz"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("%s unexpected status: %d", path, rec.Code)
		}
		if strings.TrimSpace(rec.Body.String()) != "ok" {
			t.Fatalf("%s unexpected body: %q", path, rec.Body.String())
		}
	}
}

func TestSessionStartsUnauthenticatedAndAuthenticatesAfterLogin(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "owner-password-123", false); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	handler := NewHandler(store)

	sessionReq := httptest.NewRequest(http.MethodGet, "/api/auth/session", nil)
	sessionRec := httptest.NewRecorder()
	handler.ServeHTTP(sessionRec, sessionReq)

	if sessionRec.Code != http.StatusOK {
		t.Fatalf("unexpected session status: %d", sessionRec.Code)
	}
	if got := strings.TrimSpace(sessionRec.Body.String()); got != `{"authenticated":false}` {
		t.Fatalf("unexpected session body: %q", got)
	}

	loginRec := login(t, handler, "owner@example.com", "owner-password-123")
	if loginRec.Code != http.StatusOK {
		t.Fatalf("unexpected login status: %d body=%s", loginRec.Code, loginRec.Body.String())
	}
	if !strings.Contains(loginRec.Body.String(), `"authenticated":true`) {
		t.Fatalf("expected authenticated response, got %q", loginRec.Body.String())
	}
	if !strings.Contains(loginRec.Body.String(), `"ownerEmail":"owner@example.com"`) {
		t.Fatalf("expected own workspace in session response, got %q", loginRec.Body.String())
	}
}

func TestLoginSetsSecureSessionCookieWhenPublicBaseURLIsHTTPS(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "owner-password-123", false); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	handler := NewHandler(store, HandlerOptions{
		GoogleAuth: GoogleAuthConfig{
			PublicBaseURL: "https://eco.treehousehl.com",
		},
	})

	loginReq := httptest.NewRequest(
		http.MethodPost,
		"https://eco.treehousehl.com/api/auth/login",
		strings.NewReader(`{"email":"owner@example.com","password":"owner-password-123"}`),
	)
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	handler.ServeHTTP(loginRec, loginReq)

	if loginRec.Code != http.StatusOK {
		t.Fatalf("unexpected login status: %d body=%s", loginRec.Code, loginRec.Body.String())
	}

	sessionCookie := requireSessionCookie(t, loginRec)
	if !sessionCookie.Secure {
		t.Fatalf("expected secure session cookie for https public base url")
	}
}

func TestLoginLeavesSessionCookieInsecureOnLocalHTTP(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "owner-password-123", false); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	handler := NewHandler(store)
	loginRec := login(t, handler, "owner@example.com", "owner-password-123")

	if loginRec.Code != http.StatusOK {
		t.Fatalf("unexpected login status: %d body=%s", loginRec.Code, loginRec.Body.String())
	}

	sessionCookie := requireSessionCookie(t, loginRec)
	if sessionCookie.Secure {
		t.Fatalf("expected non-secure session cookie for local http login")
	}
}

func TestLoginSetsSecureSessionCookieWhenProxySignalsHTTPS(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "owner-password-123", false); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	handler := NewHandler(store)
	loginReq := httptest.NewRequest(
		http.MethodPost,
		"http://eco.treehousehl.com/api/auth/login",
		strings.NewReader(`{"email":"owner@example.com","password":"owner-password-123"}`),
	)
	loginReq.Header.Set("Content-Type", "application/json")
	loginReq.Header.Set("X-Forwarded-Proto", "https")
	loginRec := httptest.NewRecorder()
	handler.ServeHTTP(loginRec, loginReq)

	if loginRec.Code != http.StatusOK {
		t.Fatalf("unexpected login status: %d body=%s", loginRec.Code, loginRec.Body.String())
	}

	sessionCookie := requireSessionCookie(t, loginRec)
	if !sessionCookie.Secure {
		t.Fatalf("expected secure session cookie when proxy signals https")
	}
}

func TestProvisionedUserMustResetPasswordBeforeUsingTodos(t *testing.T) {
	store := newMemoryStore()
	provisionedUser, err := store.ProvisionUser(t.Context(), "reset@example.com")
	if err != nil {
		t.Fatalf("provision user: %v", err)
	}

	handler := NewHandler(store)
	loginRec := login(t, handler, provisionedUser.Email, provisionedUser.Password)
	cookie := requireSessionCookie(t, loginRec)

	todosReq := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	todosReq.AddCookie(cookie)
	todosRec := httptest.NewRecorder()
	handler.ServeHTTP(todosRec, todosReq)

	if todosRec.Code != http.StatusForbidden {
		t.Fatalf("unexpected todos status before reset: %d", todosRec.Code)
	}
	if got := strings.TrimSpace(todosRec.Body.String()); got != `{"error":"password reset required"}` {
		t.Fatalf("unexpected todos body before reset: %q", got)
	}

	resetReq := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{"newPassword":"reset-password-456"}`))
	resetReq.Header.Set("Content-Type", "application/json")
	resetReq.AddCookie(cookie)
	resetRec := httptest.NewRecorder()
	handler.ServeHTTP(resetRec, resetReq)

	if resetRec.Code != http.StatusOK {
		t.Fatalf("unexpected reset status: %d body=%s", resetRec.Code, resetRec.Body.String())
	}
	if !strings.Contains(resetRec.Body.String(), `"passwordResetRequired":false`) {
		t.Fatalf("expected cleared reset requirement, got %q", resetRec.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	listReq.AddCookie(cookie)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)

	if listRec.Code != http.StatusOK {
		t.Fatalf("unexpected list status after reset: %d body=%s", listRec.Code, listRec.Body.String())
	}
	if got := strings.TrimSpace(listRec.Body.String()); got != `{"items":[],"workspaceEmail":"reset@example.com"}` {
		t.Fatalf("unexpected list body after reset: %q", got)
	}
}

func TestAuthenticatedUserPasswordChangeStillRequiresCurrentPassword(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "owner-password-123", false); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	handler := NewHandler(store)
	loginRec := login(t, handler, "owner@example.com", "owner-password-123")
	cookie := requireSessionCookie(t, loginRec)

	resetReq := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{"newPassword":"replacement-password-456"}`))
	resetReq.Header.Set("Content-Type", "application/json")
	resetReq.AddCookie(cookie)
	resetRec := httptest.NewRecorder()
	handler.ServeHTTP(resetRec, resetReq)

	if resetRec.Code != http.StatusBadRequest {
		t.Fatalf("unexpected reset status without current password: %d body=%s", resetRec.Code, resetRec.Body.String())
	}
	if got := strings.TrimSpace(resetRec.Body.String()); got != `{"error":"current password is required"}` {
		t.Fatalf("unexpected reset body without current password: %q", got)
	}
}

func TestAuthenticatedUserCreatesTodoInOwnWorkspace(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "owner-password-123", false); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	handler := NewHandler(store)
	loginRec := login(t, handler, "owner@example.com", "owner-password-123")
	cookie := requireSessionCookie(t, loginRec)

	createReq := httptest.NewRequest(http.MethodPost, "/api/todos", strings.NewReader(`{"title":"Ship auth flow"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.AddCookie(cookie)
	createRec := httptest.NewRecorder()
	handler.ServeHTTP(createRec, createReq)

	if createRec.Code != http.StatusCreated {
		t.Fatalf("unexpected create status: %d body=%s", createRec.Code, createRec.Body.String())
	}
	if got := strings.TrimSpace(createRec.Body.String()); got != `{"id":"1","title":"Ship auth flow","completed":false,"ownerEmail":"owner@example.com","workspaceEmail":"owner@example.com"}` {
		t.Fatalf("unexpected create body: %q", got)
	}
}

func TestSharedWorkspaceCollaboratorCanViewUpdateAndDeleteOwnerTodos(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "owner-password-123", false); err != nil {
		t.Fatalf("seed owner: %v", err)
	}
	if _, err := store.addUser("collab@example.com", "collab-password-123", false); err != nil {
		t.Fatalf("seed collaborator: %v", err)
	}

	handler := NewHandler(store)
	ownerCookie := requireSessionCookie(t, login(t, handler, "owner@example.com", "owner-password-123"))
	collabCookie := requireSessionCookie(t, login(t, handler, "collab@example.com", "collab-password-123"))

	createReq := httptest.NewRequest(http.MethodPost, "/api/todos", strings.NewReader(`{"title":"Share the queue"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.AddCookie(ownerCookie)
	createRec := httptest.NewRecorder()
	handler.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("unexpected owner create status: %d body=%s", createRec.Code, createRec.Body.String())
	}

	shareReq := httptest.NewRequest(http.MethodPost, "/api/shares", strings.NewReader(`{"workspaceEmail":"owner@example.com","email":"collab@example.com"}`))
	shareReq.Header.Set("Content-Type", "application/json")
	shareReq.AddCookie(ownerCookie)
	shareRec := httptest.NewRecorder()
	handler.ServeHTTP(shareRec, shareReq)

	if shareRec.Code != http.StatusCreated {
		t.Fatalf("unexpected share status: %d body=%s", shareRec.Code, shareRec.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/todos?workspace=owner@example.com", nil)
	listReq.AddCookie(collabCookie)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)

	if listRec.Code != http.StatusOK {
		t.Fatalf("unexpected collaborator list status: %d body=%s", listRec.Code, listRec.Body.String())
	}
	if !strings.Contains(listRec.Body.String(), `"ownerEmail":"owner@example.com"`) {
		t.Fatalf("expected owner-owned todo, got %q", listRec.Body.String())
	}

	updateReq := httptest.NewRequest(http.MethodPatch, "/api/todos/1", strings.NewReader(`{"completed":true}`))
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.AddCookie(collabCookie)
	updateRec := httptest.NewRecorder()
	handler.ServeHTTP(updateRec, updateReq)

	if updateRec.Code != http.StatusOK {
		t.Fatalf("unexpected collaborator update status: %d body=%s", updateRec.Code, updateRec.Body.String())
	}
	if got := strings.TrimSpace(updateRec.Body.String()); got != `{"id":"1","title":"Share the queue","completed":true,"ownerEmail":"owner@example.com","workspaceEmail":"owner@example.com"}` {
		t.Fatalf("unexpected collaborator update body: %q", got)
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/api/todos/1", nil)
	deleteReq.AddCookie(collabCookie)
	deleteRec := httptest.NewRecorder()
	handler.ServeHTTP(deleteRec, deleteReq)

	if deleteRec.Code != http.StatusNoContent {
		t.Fatalf("unexpected collaborator delete status: %d body=%s", deleteRec.Code, deleteRec.Body.String())
	}

	listAfterDeleteReq := httptest.NewRequest(http.MethodGet, "/api/todos?workspace=owner@example.com", nil)
	listAfterDeleteReq.AddCookie(ownerCookie)
	listAfterDeleteRec := httptest.NewRecorder()
	handler.ServeHTTP(listAfterDeleteRec, listAfterDeleteReq)

	if listAfterDeleteRec.Code != http.StatusOK {
		t.Fatalf("unexpected owner list status after delete: %d body=%s", listAfterDeleteRec.Code, listAfterDeleteRec.Body.String())
	}
	if got := strings.TrimSpace(listAfterDeleteRec.Body.String()); got != `{"items":[],"workspaceEmail":"owner@example.com"}` {
		t.Fatalf("unexpected owner list body after delete: %q", got)
	}
}

func login(t *testing.T, handler http.Handler, email string, password string) *httptest.ResponseRecorder {
	t.Helper()

	loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(`{"email":"`+email+`","password":"`+password+`"}`))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	handler.ServeHTTP(loginRec, loginReq)

	return loginRec
}

func requireSessionCookie(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()

	response := rec.Result()
	for _, cookie := range response.Cookies() {
		if cookie.Name == sessionCookieName {
			return cookie
		}
	}

	t.Fatalf("session cookie not found in response")
	return nil
}

func TestLoginResponseSerializesWorkspaces(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "owner-password-123", false); err != nil {
		t.Fatalf("seed owner: %v", err)
	}

	handler := NewHandler(store)
	loginRec := login(t, handler, "owner@example.com", "owner-password-123")

	var state SessionState
	if err := json.Unmarshal(loginRec.Body.Bytes(), &state); err != nil {
		t.Fatalf("decode session state: %v", err)
	}

	if !state.Authenticated {
		t.Fatalf("expected authenticated state")
	}
	if state.User == nil || state.User.Email != "owner@example.com" {
		t.Fatalf("unexpected session user: %+v", state.User)
	}
	if len(state.AccessibleWorkspaces) != 1 || state.AccessibleWorkspaces[0].OwnerEmail != "owner@example.com" {
		t.Fatalf("unexpected workspaces: %+v", state.AccessibleWorkspaces)
	}
}

func TestSessionAdvertisesGoogleLoginWhenConfigured(t *testing.T) {
	handler := NewHandler(newMemoryStore(), HandlerOptions{
		GoogleAuth: GoogleAuthConfig{
			ClientID:      "google-client-id",
			ClientSecret:  "google-client-secret",
			PublicBaseURL: "https://eco.treehousehl.com",
		},
	})

	req := httptest.NewRequest(http.MethodGet, "https://eco.treehousehl.com/api/auth/session", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected session status: %d", rec.Code)
	}

	var state SessionState
	if err := json.Unmarshal(rec.Body.Bytes(), &state); err != nil {
		t.Fatalf("decode session state: %v", err)
	}

	if state.Authenticated {
		t.Fatalf("expected unauthenticated state")
	}
	if !state.GoogleLoginEnabled {
		t.Fatalf("expected google login to be enabled")
	}
	if state.GoogleLoginURL != "https://eco.treehousehl.com/api/auth/google/start" {
		t.Fatalf("unexpected google login url: %q", state.GoogleLoginURL)
	}
}

func TestGoogleLoginCallbackCreatesSessionForExistingVerifiedUser(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@gmail.com", "temporary-password-123", true); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	oauthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/token":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"google-access-token","token_type":"Bearer","expires_in":3600}`))
		case "/userinfo":
			if got := r.Header.Get("Authorization"); got != "Bearer google-access-token" {
				t.Fatalf("unexpected authorization header: %q", got)
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"email":"owner@gmail.com","email_verified":true}`))
		default:
			t.Fatalf("unexpected oauth test path: %s", r.URL.Path)
		}
	}))
	defer oauthServer.Close()

	handler := NewHandler(store, HandlerOptions{
		GoogleAuth: GoogleAuthConfig{
			ClientID:         "google-client-id",
			ClientSecret:     "google-client-secret",
			PublicBaseURL:    "https://eco.treehousehl.com",
			AuthURL:          oauthServer.URL + "/auth",
			TokenURL:         oauthServer.URL + "/token",
			UserInfoEndpoint: oauthServer.URL + "/userinfo",
		},
	})

	callbackReq := httptest.NewRequest(
		http.MethodGet,
		"https://eco.treehousehl.com/api/auth/google/callback?state=google-state&code=google-code",
		nil,
	)
	callbackReq.AddCookie(newGoogleStateCookie("google-state", true))
	callbackRec := httptest.NewRecorder()
	handler.ServeHTTP(callbackRec, callbackReq)

	if callbackRec.Code != http.StatusSeeOther {
		t.Fatalf("unexpected callback status: %d body=%s", callbackRec.Code, callbackRec.Body.String())
	}
	location, err := callbackRec.Result().Location()
	if err != nil {
		t.Fatalf("callback redirect location: %v", err)
	}
	if location.String() != "https://eco.treehousehl.com/" {
		t.Fatalf("unexpected callback redirect: %s", location)
	}

	sessionCookie := requireSessionCookie(t, callbackRec)
	sessionReq := httptest.NewRequest(http.MethodGet, "https://eco.treehousehl.com/api/auth/session", nil)
	sessionReq.AddCookie(sessionCookie)
	sessionRec := httptest.NewRecorder()
	handler.ServeHTTP(sessionRec, sessionReq)

	if sessionRec.Code != http.StatusOK {
		t.Fatalf("unexpected session status after google login: %d body=%s", sessionRec.Code, sessionRec.Body.String())
	}

	var state SessionState
	if err := json.Unmarshal(sessionRec.Body.Bytes(), &state); err != nil {
		t.Fatalf("decode session state: %v", err)
	}
	if !state.Authenticated {
		t.Fatalf("expected authenticated session")
	}
	if state.User == nil || state.User.Email != "owner@gmail.com" {
		t.Fatalf("unexpected session user: %+v", state.User)
	}
	if !state.User.PasswordResetRequired {
		t.Fatalf("expected google login to preserve password reset requirement")
	}
}

func TestGoogleLoginCallbackRejectsUnknownUser(t *testing.T) {
	oauthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/token":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"google-access-token","token_type":"Bearer","expires_in":3600}`))
		case "/userinfo":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"email":"missing@gmail.com","email_verified":true}`))
		default:
			t.Fatalf("unexpected oauth test path: %s", r.URL.Path)
		}
	}))
	defer oauthServer.Close()

	handler := NewHandler(newMemoryStore(), HandlerOptions{
		GoogleAuth: GoogleAuthConfig{
			ClientID:         "google-client-id",
			ClientSecret:     "google-client-secret",
			PublicBaseURL:    "https://eco.treehousehl.com",
			AuthURL:          oauthServer.URL + "/auth",
			TokenURL:         oauthServer.URL + "/token",
			UserInfoEndpoint: oauthServer.URL + "/userinfo",
		},
	})

	callbackReq := httptest.NewRequest(
		http.MethodGet,
		"https://eco.treehousehl.com/api/auth/google/callback?state=google-state&code=google-code",
		nil,
	)
	callbackReq.AddCookie(newGoogleStateCookie("google-state", true))
	callbackRec := httptest.NewRecorder()
	handler.ServeHTTP(callbackRec, callbackReq)

	if callbackRec.Code != http.StatusSeeOther {
		t.Fatalf("unexpected callback status: %d body=%s", callbackRec.Code, callbackRec.Body.String())
	}
	location, err := callbackRec.Result().Location()
	if err != nil {
		t.Fatalf("callback redirect location: %v", err)
	}

	parsedQuery, err := url.ParseQuery(location.RawQuery)
	if err != nil {
		t.Fatalf("parse callback redirect query: %v", err)
	}
	if parsedQuery.Get("authError") != "google_account_not_allowed" {
		t.Fatalf("unexpected authError redirect: %q", parsedQuery.Get("authError"))
	}
}

func TestGoogleLoginCallbackRejectsNonGmailAccount(t *testing.T) {
	store := newMemoryStore()
	if _, err := store.addUser("owner@example.com", "temporary-password-123", false); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	oauthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/token":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"google-access-token","token_type":"Bearer","expires_in":3600}`))
		case "/userinfo":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"email":"owner@example.com","email_verified":true}`))
		default:
			t.Fatalf("unexpected oauth test path: %s", r.URL.Path)
		}
	}))
	defer oauthServer.Close()

	handler := NewHandler(store, HandlerOptions{
		GoogleAuth: GoogleAuthConfig{
			ClientID:         "google-client-id",
			ClientSecret:     "google-client-secret",
			PublicBaseURL:    "https://eco.treehousehl.com",
			AuthURL:          oauthServer.URL + "/auth",
			TokenURL:         oauthServer.URL + "/token",
			UserInfoEndpoint: oauthServer.URL + "/userinfo",
		},
	})

	callbackReq := httptest.NewRequest(
		http.MethodGet,
		"https://eco.treehousehl.com/api/auth/google/callback?state=google-state&code=google-code",
		nil,
	)
	callbackReq.AddCookie(newGoogleStateCookie("google-state", true))
	callbackRec := httptest.NewRecorder()
	handler.ServeHTTP(callbackRec, callbackReq)

	if callbackRec.Code != http.StatusSeeOther {
		t.Fatalf("unexpected callback status: %d body=%s", callbackRec.Code, callbackRec.Body.String())
	}
	location, err := callbackRec.Result().Location()
	if err != nil {
		t.Fatalf("callback redirect location: %v", err)
	}

	parsedQuery, err := url.ParseQuery(location.RawQuery)
	if err != nil {
		t.Fatalf("parse callback redirect query: %v", err)
	}
	if parsedQuery.Get("authError") != "google_email_not_supported" {
		t.Fatalf("unexpected authError redirect: %q", parsedQuery.Get("authError"))
	}
}
