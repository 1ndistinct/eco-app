# API Contracts

Backend owns the initial service contract handoff for the first vertical slice.

## Auth And Session API

### `GET /healthz`
- `200 text/plain`: `ok`

### `GET /api/auth/session`
- response when signed out: `200 application/json`
```json
{
  "authenticated": false,
  "googleLoginEnabled": true,
  "googleLoginURL": "https://eco.treehousehl.com/api/auth/google/start"
}
```
- response when signed in: `200 application/json`
```json
{
  "authenticated": true,
  "googleLoginEnabled": true,
  "googleLoginURL": "https://eco.treehousehl.com/api/auth/google/start",
  "user": {
    "email": "owner@example.com",
    "passwordResetRequired": false
  },
  "accessibleWorkspaces": [
    {
      "id": "1",
      "name": "Personal",
      "description": "Default workspace",
      "ownerEmail": "owner@example.com",
      "role": "owner"
    }
  ]
}
```

### `GET /api/auth/google/start`
- response: `303`
- side effect: redirects the browser to Google OAuth
- requirements:
  - Google OAuth must be configured
  - the eventual Google account email must be a verified Gmail address
  - that Gmail address must exactly match an existing provisioned user

### `GET /api/auth/google/callback`
- response: `303`
- side effects:
  - exchanges the Google authorization code
  - looks up the verified Google email
  - sets the normal HTTP-only session cookie when that email already exists in `users`
- failure behavior:
  - redirects back to `/` with `?authError=...`

### `POST /api/auth/login`
- request: `application/json`
```json
{"email":"owner@example.com","password":"secret-password"}
```
- response: `200 application/json`
- side effect: sets an HTTP-only session cookie
- error responses:
  - `400 application/json`
```json
{"error":"valid email is required"}
```
  - `401 application/json`
```json
{"error":"invalid credentials"}
```

### `POST /api/auth/reset-password`
- request: `application/json`
```json
{"currentPassword":"temporary-password","newPassword":"replacement-password"}
```
- first-login setup request after authenticating with Google or the temporary password:
```json
{"newPassword":"replacement-password"}
```
- response: `200 application/json`
- requirements:
  - authenticated session required
  - `newPassword` must be at least 12 characters
  - `currentPassword` is required only after the initial password-reset requirement has already been cleared

### `POST /api/auth/logout`
- response: `204`
- side effect: clears the session cookie

## Workspace API

Authenticated users can own multiple named workspaces.

### `POST /api/workspaces`
- request: `application/json`
```json
{"name":"Launch Queue","description":"Track rollout work."}
```
- response: `201 application/json`
```json
{
  "id": "2",
  "name": "Launch Queue",
  "description": "Track rollout work.",
  "ownerEmail": "owner@example.com",
  "role": "owner"
}
```
- validation:
  - `name` is required after trimming whitespace

### `DELETE /api/workspaces/{id}`
- response: `204`
- requirements:
  - authenticated session required
  - password reset must already be completed
  - caller must own the workspace
- side effects:
  - deletes the workspace
  - deletes its collaborator memberships
  - deletes its todos

## Todo API v2

Todos are scoped to a named workspace. Each todo keeps both:
- `workspaceId`: the workspace it belongs to
- `ownerEmail`: the user who created it

### `GET /api/todos?workspace=1`
- response: `200 application/json`
```json
{
  "items": [
    {
      "id": "1",
      "title": "Write backend first",
      "completed": false,
      "createdAt": "2026-04-28T10:30:00Z",
      "ownerEmail": "owner@example.com",
      "workspaceId": "1"
    }
  ],
  "workspaceId": "1"
}
```
- requirements:
  - authenticated session required
  - password reset must already be completed
  - caller must own or have access to the requested workspace

### `GET /api/todos/stream?workspace=1`
- response: `200 text/event-stream`
- requirements:
  - authenticated session required
  - password reset must already be completed
  - caller must own or have access to the requested workspace
- behavior:
  - opens a long-lived SSE connection for todo changes in the workspace
  - emits JSON `data:` payloads with `type`, `workspaceId`, `todoId`, and `occurredAt`
  - current event types are `todo.created`, `todo.updated`, and `todo.deleted`

### `POST /api/todos`
- request: `application/json`
```json
{"title":"Write backend first","workspaceId":"1"}
```
- response: `201 application/json`
```json
{
  "id": "1",
  "title": "Write backend first",
  "completed": false,
  "createdAt": "2026-04-28T10:30:00Z",
  "ownerEmail": "owner@example.com",
  "workspaceId": "1"
}
```
- validation:
  - `title` is required after trimming whitespace
  - `workspaceId` is optional and defaults to the first accessible workspace in the session bootstrap

### `PATCH /api/todos/{id}`
- request: `application/json`
```json
{"title":"Write backend first today","completed":true}
```
- response: `200 application/json`
```json
{
  "id": "1",
  "title": "Write backend first today",
  "completed": true,
  "createdAt": "2026-04-28T10:30:00Z",
  "editedAt": "2026-04-28T11:15:00Z",
  "ownerEmail": "owner@example.com",
  "workspaceId": "1"
}
```
- validation:
  - at least one of `title` or `completed` is required
  - `title`, when provided, must be non-empty after trimming whitespace
- error responses:
  - `401 application/json`
```json
{"error":"authentication required"}
```
  - `403 application/json`
```json
{"error":"workspace access denied"}
```
  - `404 application/json`
```json
{"error":"todo not found"}
```

### `DELETE /api/todos/{id}`
- response: `204`
- requirements:
  - authenticated session required
  - password reset must already be completed
  - caller must own or have access to the todo workspace
- error responses:
  - `401 application/json`
```json
{"error":"authentication required"}
```
  - `403 application/json`
```json
{"error":"workspace access denied"}
```
  - `404 application/json`
```json
{"error":"todo not found"}
```

## Workspace Sharing API

### `GET /api/shares?workspace=1`
- response: `200 application/json`
```json
{
  "items": [
    {
      "workspaceId": "1",
      "email": "collab@example.com"
    }
  ],
  "workspaceId": "1"
}
```

### `POST /api/shares`
- request: `application/json`
```json
{"workspaceId":"1","email":"collab@example.com"}
```
- response: `201 application/json`
```json
{"workspaceId":"1","email":"collab@example.com"}
```
- requirements:
  - authenticated session required
  - password reset must already be completed
  - caller must already have access to the workspace
  - shared user must already exist

### `DELETE /api/shares`
- request: `application/json`
```json
{"workspaceId":"1","email":"collab@example.com"}
```
- response: `204`
- requirements:
  - authenticated session required
  - password reset must already be completed
  - caller must already have access to the workspace
- validation:
  - `email` is required
  - the workspace owner cannot be removed through this endpoint

## Frontend Integration Guidance
- Treat `id` as an opaque string.
- Use `GET /api/auth/session` as the bootstrap source of truth.
- `accessibleWorkspaces` now carries the workspace `id`, `name`, `description`, `ownerEmail`, and `role`.
- Provisioned users will log in once, then immediately complete the password reset flow before any todo or share actions are allowed.
- Google login is available only when the backend reports `googleLoginEnabled: true`.
- Google login only succeeds for a verified Gmail address that exactly matches an existing provisioned user.
- A successful Google login authenticates the user but does not clear the initial password-reset requirement.
- Provisioned users who sign in with Google first still land in the password reset flow before todo or share actions are allowed.
- While `passwordResetRequired` is still true, the reset flow only needs the new password because the authenticated session is already the proof of identity.
- Newly provisioned users start with a default `Personal` workspace and can create or delete additional workspaces they own.
- Todos and sessions are stored in Postgres.
- Passwords are stored as hashes only.
- Schema changes are managed with embedded goose migrations.
- The Helm deploy runs migrations in a dedicated Job, and the app waits for the latest migration before serving traffic.
- Provision a user locally with `go run ./services/app-shell create-user <email>`.
- Provision a user in the cluster with `EMAIL=<email> task user:create:cluster`.
