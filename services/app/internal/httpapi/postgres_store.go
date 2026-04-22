package httpapi

import (
	"context"
	"database/sql"
	"errors"
	"strconv"

	sq "github.com/Masterminds/squirrel"
	"github.com/jmoiron/sqlx"
)

type postgresStore struct {
	db      *sqlx.DB
	builder sq.StatementBuilderType
}

func NewPostgresStore(db *sqlx.DB) TodoStore {
	return &postgresStore{
		db:      db,
		builder: sq.StatementBuilder.PlaceholderFormat(sq.Dollar),
	}
}

func (s *postgresStore) List(ctx context.Context) ([]Todo, error) {
	query, args, err := s.builder.
		Select("id::text AS id", "title", "completed").
		From("todos").
		OrderBy("id ASC").
		ToSql()
	if err != nil {
		return nil, err
	}

	var items []Todo
	if err := s.db.SelectContext(ctx, &items, query, args...); err != nil {
		return nil, err
	}
	if items == nil {
		return []Todo{}, nil
	}

	return items, nil
}

func (s *postgresStore) Create(ctx context.Context, title string) (Todo, error) {
	query, args, err := s.builder.
		Insert("todos").
		Columns("title").
		Values(title).
		Suffix("RETURNING id::text AS id, title, completed").
		ToSql()
	if err != nil {
		return Todo{}, err
	}

	var todo Todo
	if err := s.db.GetContext(ctx, &todo, query, args...); err != nil {
		return Todo{}, err
	}

	return todo, nil
}

func (s *postgresStore) UpdateCompleted(ctx context.Context, id string, completed bool) (Todo, error) {
	numericID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return Todo{}, ErrTodoNotFound
	}

	query, args, err := s.builder.
		Update("todos").
		Set("completed", completed).
		Where(sq.Eq{"id": numericID}).
		Suffix("RETURNING id::text AS id, title, completed").
		ToSql()
	if err != nil {
		return Todo{}, err
	}

	var todo Todo
	if err := s.db.GetContext(ctx, &todo, query, args...); errors.Is(err, sql.ErrNoRows) {
		return Todo{}, ErrTodoNotFound
	} else if err != nil {
		return Todo{}, err
	}

	return todo, nil
}
