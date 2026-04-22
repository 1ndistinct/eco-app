# API Contracts

Backend owns the initial service contract handoff for the first vertical slice.

## Todo API v1

### `GET /healthz`
- `200 text/plain`: `ok`

### `GET /api/todos`
- response: `200 application/json`
```json
{"items":[{"id":"1","title":"Write backend first","completed":false}]}
```

### `POST /api/todos`
- request: `application/json`
```json
{"title":"Write backend first"}
```
- response: `201 application/json`
```json
{"id":"1","title":"Write backend first","completed":false}
```
- validation:
  - `title` is required after trimming whitespace
- error response: `400 application/json`
```json
{"error":"title is required"}
```

### `PATCH /api/todos/{id}`
- request: `application/json`
```json
{"completed":true}
```
- response: `200 application/json`
```json
{"id":"1","title":"Write backend first","completed":true}
```
- validation:
  - `completed` is required
- error responses:
  - `400 application/json`
```json
{"error":"completed is required"}
```
  - `404 application/json`
```json
{"error":"todo not found"}
```

### Frontend integration guidance
- Treat `id` as an opaque string.
- Render items in response order.
- Expect `completed` to always be present.
- Todos are stored in Postgres.
- Schema changes are managed with embedded goose migrations.
- The Helm deploy runs migrations in a dedicated Job, and the app waits for the latest migration before serving traffic.
