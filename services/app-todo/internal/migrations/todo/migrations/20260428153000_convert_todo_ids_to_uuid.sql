-- +goose Up
-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'todos'
      AND column_name = 'id'
      AND udt_name = 'int8'
  ) THEN
    ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_pkey;
    ALTER TABLE todos RENAME COLUMN id TO legacy_id;
    ALTER TABLE todos ADD COLUMN id UUID;
    UPDATE todos
    SET id = gen_random_uuid()
    WHERE id IS NULL;
    ALTER TABLE todos ALTER COLUMN id SET NOT NULL;
    ALTER TABLE todos ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE todos ADD CONSTRAINT todos_pkey PRIMARY KEY (id);
    CREATE UNIQUE INDEX IF NOT EXISTS todos_legacy_id_idx ON todos (legacy_id);
  END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'todos'
      AND column_name = 'legacy_id'
  ) THEN
    ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_pkey;
    DROP INDEX IF EXISTS todos_legacy_id_idx;
    ALTER TABLE todos DROP COLUMN IF EXISTS id;
    ALTER TABLE todos RENAME COLUMN legacy_id TO id;
    ALTER TABLE todos ADD CONSTRAINT todos_pkey PRIMARY KEY (id);
  END IF;
END $$;
-- +goose StatementEnd
