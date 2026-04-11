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

### Frontend integration guidance
- Treat `id` as an opaque string.
- Render items in response order.
- Expect `completed` to always be present.
- Current backend storage is in-memory and resets on process restart.
