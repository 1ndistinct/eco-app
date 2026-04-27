-- +goose Up
ALTER TABLE todos ADD COLUMN IF NOT EXISTS workspace_email TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'todos_workspace_email_users_fkey'
  ) THEN
    ALTER TABLE todos
      ADD CONSTRAINT todos_workspace_email_users_fkey
      FOREIGN KEY (workspace_email) REFERENCES users(email) ON DELETE CASCADE;
  END IF;
END $$;
-- +goose StatementEnd

-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'todos_owner_email_users_fkey'
  ) THEN
    ALTER TABLE todos
      ADD CONSTRAINT todos_owner_email_users_fkey
      FOREIGN KEY (owner_email) REFERENCES users(email) ON DELETE RESTRICT;
  END IF;
END $$;
-- +goose StatementEnd

CREATE INDEX IF NOT EXISTS todos_workspace_email_idx ON todos (workspace_email);

-- +goose Down
DROP INDEX IF EXISTS todos_workspace_email_idx;
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_owner_email_users_fkey;
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_workspace_email_users_fkey;
ALTER TABLE todos DROP COLUMN IF EXISTS owner_email;
ALTER TABLE todos DROP COLUMN IF EXISTS workspace_email;
