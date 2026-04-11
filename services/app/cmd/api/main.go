package main

import (
	"log"
	"net/http"

	"github.com/1ndistinct/echo-agentic-todo-postfix-20260411210213/services/app/internal/httpapi"
)

func main() {
	server := &http.Server{
		Addr:    ":8080",
		Handler: httpapi.Handler(),
	}
	log.Printf("app api listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}
