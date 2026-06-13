-- +goose Up
DELETE FROM workspace_memberships
USING workspaces
WHERE workspace_memberships.workspace_id = workspaces.id
  AND workspace_memberships.user_email = workspaces.owner_email;

-- +goose Down
SELECT 1;
