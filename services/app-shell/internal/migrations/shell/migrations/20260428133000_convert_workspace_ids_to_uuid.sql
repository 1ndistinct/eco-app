-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'id'
      AND udt_name = 'int8'
  ) THEN
    ALTER TABLE workspaces RENAME COLUMN id TO legacy_id;
    ALTER TABLE workspaces ADD COLUMN id UUID;
    UPDATE workspaces
    SET id = gen_random_uuid()
    WHERE id IS NULL;
    ALTER TABLE workspaces ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE workspaces ALTER COLUMN id SET NOT NULL;
  END IF;
END $$;
-- +goose StatementEnd

-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'legacy_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspaces_id_key'
  ) THEN
    ALTER TABLE workspaces
      ADD CONSTRAINT workspaces_id_key UNIQUE (id);
  END IF;
END $$;
-- +goose StatementEnd

-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspace_memberships'
      AND column_name = 'workspace_id'
      AND udt_name = 'int8'
  ) THEN
    ALTER TABLE workspace_memberships RENAME COLUMN workspace_id TO legacy_workspace_id;
    ALTER TABLE workspace_memberships ADD COLUMN workspace_id UUID;
    UPDATE workspace_memberships
    SET workspace_id = workspaces.id
    FROM workspaces
    WHERE workspace_memberships.workspace_id IS NULL
      AND workspace_memberships.legacy_workspace_id = workspaces.legacy_id;
    ALTER TABLE workspace_memberships ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END $$;
-- +goose StatementEnd

ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_pkey;
ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_workspace_id_workspaces_fkey;

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

-- +goose Down
-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'legacy_id'
  ) THEN
    ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_pkey;
    ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_workspace_id_workspaces_fkey;
    ALTER TABLE workspace_memberships DROP COLUMN IF EXISTS workspace_id;
    ALTER TABLE workspace_memberships RENAME COLUMN legacy_workspace_id TO workspace_id;
    ALTER TABLE workspace_memberships
      ADD CONSTRAINT workspace_memberships_workspace_id_workspaces_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(legacy_id) ON DELETE CASCADE;
    ALTER TABLE workspace_memberships
      ADD PRIMARY KEY (workspace_id, user_email);

    ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_id_key;
    ALTER TABLE workspaces DROP COLUMN IF EXISTS id;
    ALTER TABLE workspaces RENAME COLUMN legacy_id TO id;
  END IF;
END $$;
-- +goose StatementEnd
