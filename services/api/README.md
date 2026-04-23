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
- response: `200 application/json`
- requirements:
  - authenticated session required
  - `newPassword` must be at least 12 characters

### `POST /api/auth/logout`
- response: `204`
- side effect: clears the session cookie

## Todo API v2

Todos are scoped to a workspace owned by a user. Each todo keeps both:
- `workspaceEmail`: the workspace it belongs to
- `ownerEmail`: the user who created it

### `GET /api/todos?workspace=owner@example.com`
- response: `200 application/json`
```json
{
  "items": [
    {
      "id": "1",
      "title": "Write backend first",
      "completed": false,
      "ownerEmail": "owner@example.com",
      "workspaceEmail": "owner@example.com"
    }
  ],
  "workspaceEmail": "owner@example.com"
}
```
- requirements:
  - authenticated session required
  - password reset must already be completed
  - caller must own or have access to the requested workspace

### `POST /api/todos`
- request: `application/json`
```json
{"title":"Write backend first","workspaceEmail":"owner@example.com"}
```
- response: `201 application/json`
```json
{
  "id": "1",
  "title": "Write backend first",
  "completed": false,
  "ownerEmail": "owner@example.com",
  "workspaceEmail": "owner@example.com"
}
```
- validation:
  - `title` is required after trimming whitespace
  - `workspaceEmail` is optional and defaults to the signed-in user

### `PATCH /api/todos/{id}`
- request: `application/json`
```json
{"completed":true}
```
- response: `200 application/json`
```json
{
  "id": "1",
  "title": "Write backend first",
  "completed": true,
  "ownerEmail": "owner@example.com",
  "workspaceEmail": "owner@example.com"
}
```
- validation:
  - `completed` is required
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

### `GET /api/shares?workspace=owner@example.com`
- response: `200 application/json`
```json
{
  "items": [
    {
      "workspaceEmail": "owner@example.com",
      "email": "collab@example.com"
    }
  ],
  "workspaceEmail": "owner@example.com"
}
```

### `POST /api/shares`
- request: `application/json`
```json
{"workspaceEmail":"owner@example.com","email":"collab@example.com"}
```
- response: `201 application/json`
```json
{"workspaceEmail":"owner@example.com","email":"collab@example.com"}
```
- requirements:
  - authenticated session required
  - password reset must already be completed
  - caller must already have access to the workspace
  - shared user must already exist

## Frontend Integration Guidance
- Treat `id` as an opaque string.
- Use `GET /api/auth/session` as the bootstrap source of truth.
- Provisioned users will log in once, then immediately complete the password reset flow before any todo or share actions are allowed.
- Google login is available only when the backend reports `googleLoginEnabled: true`.
- Google login only succeeds for a verified Gmail address that exactly matches an existing provisioned user.
- A successful Google login authenticates the user but does not clear the initial password-reset requirement.
- Provisioned users who sign in with Google first still land in the password reset flow before todo or share actions are allowed.
- Todos and sessions are stored in Postgres.
- Passwords are stored as hashes only.
- Schema changes are managed with embedded goose migrations.
- The Helm deploy runs migrations in a dedicated Job, and the app waits for the latest migration before serving traffic.
- Provision a user locally with `go run ./services/app/cmd/api create-user <email>`.
- Provision a user in the cluster with `EMAIL=<email> task user:create:cluster`.
