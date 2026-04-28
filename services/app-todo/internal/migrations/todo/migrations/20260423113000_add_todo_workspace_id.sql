-- +goose Up
ALTER TABLE todos ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- +goose StatementBegin
WITH default_workspaces AS (
  SELECT owner_email, id AS workspace_id
  FROM workspaces
)
UPDATE todos
SET workspace_id = default_workspaces.workspace_id
FROM default_workspaces
WHERE todos.workspace_id IS NULL
  AND COALESCE(todos.workspace_email, todos.owner_email) = default_workspaces.owner_email;
-- +goose StatementEnd

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
DROP INDEX IF EXISTS todos_workspace_id_idx;
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_workspace_id_workspaces_fkey;
ALTER TABLE todos DROP COLUMN IF EXISTS workspace_id;
