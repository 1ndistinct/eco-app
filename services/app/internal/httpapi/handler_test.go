package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandlerHealthz(t *testing.T) {
	handler := Handler()

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

func TestHandlerUpdatesTodoCompletion(t *testing.T) {
	handler := Handler()

	createReq := httptest.NewRequest(http.MethodPost, "/api/todos", strings.NewReader(`{"title":"Close the loop"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	handler.ServeHTTP(createRec, createReq)

	if createRec.Code != http.StatusCreated {
		t.Fatalf("unexpected create status: %d", createRec.Code)
	}

	updateReq := httptest.NewRequest(http.MethodPatch, "/api/todos/1", strings.NewReader(`{"completed":true}`))
	updateReq.Header.Set("Content-Type", "application/json")
	updateRec := httptest.NewRecorder()
	handler.ServeHTTP(updateRec, updateReq)

	if updateRec.Code != http.StatusOK {
		t.Fatalf("unexpected update status: %d", updateRec.Code)
	}
	if got := strings.TrimSpace(updateRec.Body.String()); got != `{"id":"1","title":"Close the loop","completed":true}` {
		t.Fatalf("unexpected update body: %q", got)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)

	if listRec.Code != http.StatusOK {
		t.Fatalf("unexpected list status: %d", listRec.Code)
	}
	if got := strings.TrimSpace(listRec.Body.String()); got != `{"items":[{"id":"1","title":"Close the loop","completed":true}]}` {
		t.Fatalf("unexpected list body: %q", got)
	}
}

func TestHandlerRejectsTodoPatchWithoutCompleted(t *testing.T) {
	handler := Handler()

	createReq := httptest.NewRequest(http.MethodPost, "/api/todos", strings.NewReader(`{"title":"Shape the UI"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	handler.ServeHTTP(createRec, createReq)

	updateReq := httptest.NewRequest(http.MethodPatch, "/api/todos/1", strings.NewReader(`{}`))
	updateReq.Header.Set("Content-Type", "application/json")
	updateRec := httptest.NewRecorder()
	handler.ServeHTTP(updateRec, updateReq)

	if updateRec.Code != http.StatusBadRequest {
		t.Fatalf("unexpected status: %d", updateRec.Code)
	}
	if got := strings.TrimSpace(updateRec.Body.String()); got != `{"error":"completed is required"}` {
		t.Fatalf("unexpected body: %q", got)
	}
}
