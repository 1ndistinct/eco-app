-- +goose Up
-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'todos'
      AND column_name = 'workspace_id'
      AND udt_name = 'int8'
  ) THEN
    ALTER TABLE todos RENAME COLUMN workspace_id TO legacy_workspace_id;
    ALTER TABLE todos ADD COLUMN workspace_id UUID;
    UPDATE todos
    SET workspace_id = workspaces.id
    FROM workspaces
    WHERE todos.workspace_id IS NULL
      AND todos.legacy_workspace_id = workspaces.legacy_id;
    ALTER TABLE todos ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END $$;
-- +goose StatementEnd

DROP INDEX IF EXISTS todos_workspace_id_idx;
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_workspace_id_workspaces_fkey;

-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'todos_workspace_id_workspaces_fkey'
  ) THEN
    ALTER TABLE todos
      ADD CONSTRAINT todos_workspace_id_workspaces_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;
-- +goose StatementEnd

CREATE INDEX IF NOT EXISTS todos_workspace_id_idx ON todos (workspace_id);

-- +goose Down
-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'todos'
      AND column_name = 'legacy_workspace_id'
  ) THEN
    DROP INDEX IF EXISTS todos_workspace_id_idx;
    ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_workspace_id_workspaces_fkey;
    ALTER TABLE todos DROP COLUMN IF EXISTS workspace_id;
    ALTER TABLE todos RENAME COLUMN legacy_workspace_id TO workspace_id;
    ALTER TABLE todos
      ADD CONSTRAINT todos_workspace_id_workspaces_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(legacy_id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS todos_workspace_id_idx ON todos (workspace_id);
  END IF;
END $$;
-- +goose StatementEnd
