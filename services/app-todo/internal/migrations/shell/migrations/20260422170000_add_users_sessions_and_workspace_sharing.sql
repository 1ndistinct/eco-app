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

CREATE INDEX IF NOT EXISTS user_sessions_user_email_idx ON user_sessions (user_email);
CREATE INDEX IF NOT EXISTS workspace_memberships_user_email_idx ON workspace_memberships (user_email);

-- +goose Down
DROP INDEX IF EXISTS workspace_memberships_user_email_idx;
DROP INDEX IF EXISTS user_sessions_user_email_idx;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS workspace_memberships;
DROP TABLE IF EXISTS users;
