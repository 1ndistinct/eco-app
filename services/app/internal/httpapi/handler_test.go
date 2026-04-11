package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandlerHealthz(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d", rec.Code)
	}
	if rec.Body.String() != "ok" {
		t.Fatalf("unexpected body: %q", rec.Body.String())
	}
}

func TestHandlerListsEmptyTodos(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	rec := httptest.NewRecorder()

	Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d", rec.Code)
	}
	if got := strings.TrimSpace(rec.Body.String()); got != `{"items":[]}` {
		t.Fatalf("unexpected body: %q", got)
	}
}

func TestHandlerCreatesTodo(t *testing.T) {
	handler := Handler()

	createReq := httptest.NewRequest(http.MethodPost, "/api/todos", strings.NewReader(`{"title":"Write backend first"}`))
	createRec := httptest.NewRecorder()
	createReq.Header.Set("Content-Type", "application/json")

	handler.ServeHTTP(createRec, createReq)

	if createRec.Code != http.StatusCreated {
		t.Fatalf("unexpected create status: %d", createRec.Code)
	}
	if got := strings.TrimSpace(createRec.Body.String()); got != `{"id":"1","title":"Write backend first","completed":false}` {
		t.Fatalf("unexpected create body: %q", got)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)

	if listRec.Code != http.StatusOK {
		t.Fatalf("unexpected list status: %d", listRec.Code)
	}
	if got := strings.TrimSpace(listRec.Body.String()); got != `{"items":[{"id":"1","title":"Write backend first","completed":false}]}` {
		t.Fatalf("unexpected list body: %q", got)
	}
}

func TestHandlerRejectsInvalidTodo(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/todos", strings.NewReader(`{"title":"   "}`))
	rec := httptest.NewRecorder()

	Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unexpected status: %d", rec.Code)
	}
	if got := strings.TrimSpace(rec.Body.String()); got != `{"error":"title is required"}` {
		t.Fatalf("unexpected body: %q", got)
	}
}
