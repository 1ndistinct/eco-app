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

func Handler() http.Handler {
	return NewHandler(newTodoStore())
}

func NewHandler(store *todoStore) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
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
	return mux
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
