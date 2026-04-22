package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
)

type Todo struct {
	ID        string `json:"id" db:"id"`
	Title     string `json:"title" db:"title"`
	Completed bool   `json:"completed" db:"completed"`
}

type createTodoRequest struct {
	Title string `json:"title"`
}

type updateTodoRequest struct {
	Completed *bool `json:"completed"`
}

type errorResponse struct {
	Error string `json:"error"`
}

var ErrTodoNotFound = errors.New("todo not found")

type TodoStore interface {
	List(ctx context.Context) ([]Todo, error)
	Create(ctx context.Context, title string) (Todo, error)
	UpdateCompleted(ctx context.Context, id string, completed bool) (Todo, error)
}

type todoStore struct {
	mu     sync.Mutex
	nextID int
	todos  []Todo
}

func newTodoStore() *todoStore {
	return &todoStore{nextID: 1}
}

func (s *todoStore) List(_ context.Context) ([]Todo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	items := make([]Todo, len(s.todos))
	copy(items, s.todos)
	sort.Slice(items, func(i, j int) bool {
		return items[i].ID < items[j].ID
	})
	return items, nil
}

func (s *todoStore) Create(_ context.Context, title string) (Todo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	todo := Todo{
		ID:        strconv.Itoa(s.nextID),
		Title:     title,
		Completed: false,
	}
	s.nextID++
	s.todos = append(s.todos, todo)
	return todo, nil
}

func (s *todoStore) UpdateCompleted(_ context.Context, id string, completed bool) (Todo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for index, todo := range s.todos {
		if todo.ID != id {
			continue
		}

		todo.Completed = completed
		s.todos[index] = todo
		return todo, nil
	}

	return Todo{}, ErrTodoNotFound
}

func Handler() http.Handler {
	return NewHandler(newTodoStore())
}

func NewHandler(store TodoStore) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthzHandler)
	mux.HandleFunc("/api/healthz", healthzHandler)
	mux.HandleFunc("/api/todos", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			items, err := store.List(r.Context())
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"items": items})
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
			todo, err := store.Create(r.Context(), title)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
				return
			}
			writeJSON(w, http.StatusCreated, todo)
		default:
			w.Header().Set("Allow", "GET, POST")
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	})
	mux.HandleFunc("/api/todos/", func(w http.ResponseWriter, r *http.Request) {
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
			if req.Completed == nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "completed is required"})
				return
			}

			todo, err := store.UpdateCompleted(r.Context(), id, *req.Completed)
			if errors.Is(err, ErrTodoNotFound) {
				writeJSON(w, http.StatusNotFound, errorResponse{Error: "todo not found"})
				return
			}
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
				return
			}

			writeJSON(w, http.StatusOK, todo)
		default:
			w.Header().Set("Allow", "PATCH")
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	})
	return mux
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
