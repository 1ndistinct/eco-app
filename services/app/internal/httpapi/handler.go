package httpapi

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
)

type Todo struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
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

type todoStore struct {
	mu     sync.Mutex
	nextID int
	todos  []Todo
}

func newTodoStore() *todoStore {
	return &todoStore{nextID: 1}
}

func (s *todoStore) list() []Todo {
	s.mu.Lock()
	defer s.mu.Unlock()

	items := make([]Todo, len(s.todos))
	copy(items, s.todos)
	sort.Slice(items, func(i, j int) bool {
		return items[i].ID < items[j].ID
	})
	return items
}

func (s *todoStore) create(title string) Todo {
	s.mu.Lock()
	defer s.mu.Unlock()

	todo := Todo{
		ID:        strconv.Itoa(s.nextID),
		Title:     title,
		Completed: false,
	}
	s.nextID++
	s.todos = append(s.todos, todo)
	return todo
}

func (s *todoStore) updateCompleted(id string, completed bool) (Todo, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for index, todo := range s.todos {
		if todo.ID != id {
			continue
		}

		todo.Completed = completed
		s.todos[index] = todo
		return todo, true
	}

	return Todo{}, false
}

func Handler() http.Handler {
	return NewHandler(newTodoStore())
}

func NewHandler(store *todoStore) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthzHandler)
	mux.HandleFunc("/api/healthz", healthzHandler)
	mux.HandleFunc("/api/todos", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			writeJSON(w, http.StatusOK, map[string]any{"items": store.list()})
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
			writeJSON(w, http.StatusCreated, store.create(title))
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

			todo, ok := store.updateCompleted(id, *req.Completed)
			if !ok {
				writeJSON(w, http.StatusNotFound, errorResponse{Error: "todo not found"})
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
