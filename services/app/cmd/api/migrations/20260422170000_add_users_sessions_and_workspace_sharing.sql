-- +goose Up
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_reset_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  workspace_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_email, user_email),
  CHECK (workspace_email <> user_email)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS user_sessions_user_email_idx ON user_sessions (user_email);
CREATE INDEX IF NOT EXISTS workspace_memberships_user_email_idx ON workspace_memberships (user_email);

-- +goose Down
DROP INDEX IF EXISTS workspace_memberships_user_email_idx;
DROP INDEX IF EXISTS user_sessions_user_email_idx;
DROP INDEX IF EXISTS todos_workspace_email_idx;
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_owner_email_users_fkey;
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_workspace_email_users_fkey;
ALTER TABLE todos DROP COLUMN IF EXISTS owner_email;
ALTER TABLE todos DROP COLUMN IF EXISTS workspace_email;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS workspace_memberships;
DROP TABLE IF EXISTS users;
