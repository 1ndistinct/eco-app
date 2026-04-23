-- +goose Up
CREATE TABLE IF NOT EXISTS workspaces (
  id BIGSERIAL PRIMARY KEY,
  owner_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_email_idx ON workspaces (owner_email);

INSERT INTO workspaces (owner_email, name, description)
SELECT users.email, 'Personal', 'Default workspace'
FROM users
WHERE NOT EXISTS (
  SELECT 1
  FROM workspaces
  WHERE workspaces.owner_email = users.email
);

ALTER TABLE workspace_memberships ADD COLUMN IF NOT EXISTS workspace_id BIGINT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS workspace_id BIGINT;

-- +goose StatementBegin
WITH default_workspaces AS (
  SELECT owner_email, MIN(id) AS workspace_id
  FROM workspaces
  GROUP BY owner_email
)
UPDATE workspace_memberships
SET workspace_id = default_workspaces.workspace_id
FROM default_workspaces
WHERE workspace_memberships.workspace_id IS NULL
  AND workspace_memberships.workspace_email = default_workspaces.owner_email;
-- +goose StatementEnd

-- +goose StatementBegin
WITH default_workspaces AS (
  SELECT owner_email, MIN(id) AS workspace_id
  FROM workspaces
  GROUP BY owner_email
)
UPDATE todos
SET workspace_id = default_workspaces.workspace_id
FROM default_workspaces
WHERE todos.workspace_id IS NULL
  AND COALESCE(todos.workspace_email, todos.owner_email) = default_workspaces.owner_email;
-- +goose StatementEnd

ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_pkey;
ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_check;
ALTER TABLE workspace_memberships DROP COLUMN IF EXISTS workspace_email;
ALTER TABLE workspace_memberships ALTER COLUMN workspace_id SET NOT NULL;

-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspace_memberships_workspace_id_workspaces_fkey'
  ) THEN
    ALTER TABLE workspace_memberships
      ADD CONSTRAINT workspace_memberships_workspace_id_workspaces_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;
-- +goose StatementEnd

ALTER TABLE workspace_memberships
  ADD PRIMARY KEY (workspace_id, user_email);

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

ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_pkey;
ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_workspace_id_workspaces_fkey;
ALTER TABLE workspace_memberships ADD COLUMN IF NOT EXISTS workspace_email TEXT;

-- +goose StatementBegin
UPDATE workspace_memberships
SET workspace_email = workspaces.owner_email
FROM workspaces
WHERE workspace_memberships.workspace_id = workspaces.id;
-- +goose StatementEnd

-- +goose StatementBegin
DELETE FROM workspace_memberships a
USING workspace_memberships b
WHERE a.ctid < b.ctid
  AND a.workspace_email = b.workspace_email
  AND a.user_email = b.user_email;
-- +goose StatementEnd

ALTER TABLE workspace_memberships DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE workspace_memberships
  ADD CONSTRAINT workspace_memberships_check CHECK (workspace_email <> user_email);
ALTER TABLE workspace_memberships
  ADD PRIMARY KEY (workspace_email, user_email);

CREATE INDEX IF NOT EXISTS workspace_memberships_user_email_idx ON workspace_memberships (user_email);

DROP INDEX IF EXISTS workspaces_owner_email_idx;
DROP TABLE IF EXISTS workspaces;
