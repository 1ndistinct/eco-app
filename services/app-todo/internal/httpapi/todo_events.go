package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
)

const todoEventsSubject = "todos.events"

const (
	TodoEventTypeCreated = "todo.created"
	TodoEventTypeUpdated = "todo.updated"
	TodoEventTypeDeleted = "todo.deleted"
)

type TodoEvent struct {
	Type        string    `json:"type"`
	WorkspaceID string    `json:"workspaceId"`
	TodoID      string    `json:"todoId"`
	OccurredAt  time.Time `json:"occurredAt"`
}

type TodoEventBroker struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan TodoEvent]struct{}
	natsConn    *nats.Conn
	natsSub     *nats.Subscription
}

func NewTodoEventBroker(natsURL string) (*TodoEventBroker, error) {
	broker := &TodoEventBroker{
		subscribers: make(map[string]map[chan TodoEvent]struct{}),
	}

	if strings.TrimSpace(natsURL) == "" {
		return broker, nil
	}

	natsConn, err := nats.Connect(strings.TrimSpace(natsURL))
	if err != nil {
		return nil, fmt.Errorf("connect to nats: %w", err)
	}

	natsSub, err := natsConn.Subscribe(todoEventsSubject, func(message *nats.Msg) {
		var event TodoEvent
		if err := json.Unmarshal(message.Data, &event); err != nil {
			log.Printf("todo events: ignore invalid payload: %v", err)
			return
		}

		broker.broadcast(event)
	})
	if err != nil {
		natsConn.Close()
		return nil, fmt.Errorf("subscribe to todo events: %w", err)
	}

	if err := natsConn.Flush(); err != nil {
		_ = natsSub.Unsubscribe()
		natsConn.Close()
		return nil, fmt.Errorf("flush nats subscription: %w", err)
	}
	if err := natsConn.LastError(); err != nil {
		_ = natsSub.Unsubscribe()
		natsConn.Close()
		return nil, fmt.Errorf("verify nats subscription: %w", err)
	}

	broker.natsConn = natsConn
	broker.natsSub = natsSub
	return broker, nil
}

func (b *TodoEventBroker) Close() error {
	if b == nil {
		return nil
	}

	if b.natsSub != nil {
		if err := b.natsSub.Drain(); err != nil {
			return err
		}
	}
	if b.natsConn != nil {
		if err := b.natsConn.Drain(); err != nil {
			return err
		}
		b.natsConn.Close()
	}

	return nil
}

func (b *TodoEventBroker) Publish(_ context.Context, event TodoEvent) error {
	if b == nil {
		return nil
	}

	event.WorkspaceID = strings.TrimSpace(event.WorkspaceID)
	event.TodoID = strings.TrimSpace(event.TodoID)
	if event.WorkspaceID == "" || event.TodoID == "" {
		return fmt.Errorf("todo event requires workspaceId and todoId")
	}
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now().UTC()
	}

	if b.natsConn == nil {
		b.broadcast(event)
		return nil
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal todo event: %w", err)
	}
	if err := b.natsConn.Publish(todoEventsSubject, payload); err != nil {
		return fmt.Errorf("publish todo event: %w", err)
	}

	return nil
}

func (b *TodoEventBroker) Subscribe(workspaceID string) (<-chan TodoEvent, func()) {
	events := make(chan TodoEvent, 16)
	normalizedWorkspaceID := strings.TrimSpace(workspaceID)
	if normalizedWorkspaceID == "" {
		close(events)
		return events, func() {}
	}

	b.mu.Lock()
	if b.subscribers[normalizedWorkspaceID] == nil {
		b.subscribers[normalizedWorkspaceID] = make(map[chan TodoEvent]struct{})
	}
	b.subscribers[normalizedWorkspaceID][events] = struct{}{}
	b.mu.Unlock()

	return events, func() {
		b.mu.Lock()
		defer b.mu.Unlock()

		if workspaceSubscribers := b.subscribers[normalizedWorkspaceID]; workspaceSubscribers != nil {
			delete(workspaceSubscribers, events)
			if len(workspaceSubscribers) == 0 {
				delete(b.subscribers, normalizedWorkspaceID)
			}
		}
	}
}

func (b *TodoEventBroker) broadcast(event TodoEvent) {
	b.mu.RLock()
	workspaceSubscribers := b.subscribers[event.WorkspaceID]
	channels := make([]chan TodoEvent, 0, len(workspaceSubscribers))
	for subscriber := range workspaceSubscribers {
		channels = append(channels, subscriber)
	}
	b.mu.RUnlock()

	for _, subscriber := range channels {
		select {
		case subscriber <- event:
		default:
			// Drop overflow events. Clients refetch the canonical todo list on receipt.
		}
	}
}
