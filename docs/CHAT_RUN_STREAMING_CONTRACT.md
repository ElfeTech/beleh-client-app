# Chat Run Streaming Contract

Handoff spec for the backend agent. The frontend implements against this contract and falls back to the existing blocking `POST /api/sessions/{id}/messages` when streaming endpoints are absent (404/405/501). Redis unavailable → `503` (transient; do not permanently disable streaming).

## Goals

1. A chat turn is a durable **run** identified by `run_id` (server) and `client_turn_id` (client UUID, idempotency key).
2. Refresh / tab close must **not** cancel an in-flight agent run.
3. After refresh the client reattaches to the same run via SSE and resumes from the last received sequence.
4. `client_turn_id` makes a repeat POST safe: it must attach to the existing run, never start a second agent run.

## Endpoints

### `POST /api/sessions/{session_id}/messages/stream`

Starts (or reattaches to) a chat turn as Server-Sent Events.

**Auth:** Bearer Firebase ID token (same as existing session message endpoints).

**Request body:**

```json
{
  "prompt": "string",
  "dataset_id": "uuid | null",
  "client_turn_id": "uuid"
}
```

| Field            | Required | Notes                                              |
| ---------------- | -------- | -------------------------------------------------- |
| `prompt`         | yes      | User message text                                  |
| `dataset_id`     | no       | Bound datasource or connector id; `null` = general |
| `client_turn_id` | yes      | Client-generated UUID; **idempotency key**         |

**Behavior:**

1. If a run already exists for `(session_id, client_turn_id)`:
   - Do **not** create a new user message or agent run.
   - Stream from the existing run (same as reattach), starting at seq 0 unless the client reconnects with `Last-Event-ID` / `after_seq`.
2. Otherwise:
   - Persist the user `ChatMessage` **before** emitting any event.
   - Create the run record (status `running`) **before** emitting any event.
   - Emit `run` as the first event, then continue the agent workflow.
3. A client disconnect **must not** cancel the run. The agent continues server-side; events are buffered for later reattach.
4. Response media type: `text/event-stream` with headers:

```
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

### `GET /api/sessions/{session_id}/runs/active`

Returns the in-flight (non-terminal) run for the session, if any.

**Response:**

```json
{
  "run": RunStatus | null
}
```

Used on page load when the client has a pending turn but may not yet have received `run_id`.

### `GET /api/runs/{run_id}/events?after_seq=N`

SSE reattach stream.

- Query `after_seq` (integer, default `-1`): replay buffered events with `seq > after_seq`, then go live.
- Also honor the `Last-Event-ID` header (SSE standard); if both are present, **Last-Event-ID takes precedence**.
- If the run is already terminal, emit the terminal event (`done` or `error`) immediately and close.
- Disconnect must not cancel the run.

### `GET /api/runs/{run_id}`

JSON snapshot for polling fallback.

**Response:** `RunStatus`

### `POST /api/runs/{run_id}/cancel`

Cancel an in-flight run (Stop button). Cooperative: sets a cancel flag the worker checks between steps. Best-effort if already terminal.

**Response:**

```ts
{
  run_id: string;
  status: RunStatus['status'];
  cancelled: boolean;
}
```

## RunStatus

```ts
interface RunStatus {
  run_id: string;
  session_id: string;
  client_turn_id: string;
  user_message_id: string;
  assistant_message_id: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  phase: 'planning' | 'querying' | 'analyzing' | 'rendering' | null;
  error_code: string | null;
  error_detail: string | null;
  started_at: string | null; // ISO-8601
  finished_at: string | null;
  created_at: string; // ISO-8601
}
```

`RunStatus` is a snapshot only — it does **not** embed the assistant turn. After a terminal status via poll, the client loads messages (`GET /api/sessions/{id}/messages`). The SSE `done` event still carries the full `AssistantTurnResponse` (+ `run_id`) for live streams.

`AssistantTurnResponse` is the existing shape from `POST /api/sessions/{id}/messages` (`message_id`, `role`, `text`, `artifacts`, `meta`, `session_id`), plus optional `run_id` on `done`.

## SSE event schema

Every event MUST include an `id:` line with a monotonically increasing integer `seq` (per run) so `after_seq` / `Last-Event-ID` work.

Frame format (same as public help):

```
id: 3
event: status
data: {"seq":3,"phase":"querying","label":"Running SQL…"}

```

### Event types

| `event`  | When                         | `data`                                                                               |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `run`    | Always first                 | `{ run_id, session_id, client_turn_id, user_message_id, status, started_at }`        |
| `status` | Phase changes                | `{ seq, phase, label }` — `phase` ∈ `planning \| querying \| analyzing \| rendering` |
| `token`  | Optional narrative streaming | `{ delta: string }`                                                                  |
| `done`   | Success                      | Existing `AssistantTurnResponse` fields **plus** `run_id`                            |
| `error`  | Failure                      | `{ code, detail, retryable }`                                                        |

### Heartbeat

Emit an SSE comment every ~15s while the stream is open:

```
: heartbeat

```

## Durability & TTL

- Run record + event buffer must survive client disconnect and refresh.
- Recommended: Redis (mirroring public help sessions), **TTL ≥ 24 hours** from `started_at` (or from last event).
- Terminal runs should remain readable via `GET /api/runs/{run_id}` and `GET /api/runs/{run_id}/events` until TTL expiry so a late refresh can still hydrate the answer.

## Idempotency rules (non-negotiable)

1. `(session_id, client_turn_id)` is unique. A second `POST .../messages/stream` with the same pair attaches; it never starts a second ADK run.
2. Client disconnect does **not** cancel the run. Only `POST /api/runs/{run_id}/cancel` (or server failure) ends a run early.
3. User message row is committed before the first SSE event.

## Compatibility with existing blocking POST

`POST /api/sessions/{session_id}/messages` remains for clients that do not support streaming. Prefer implementing streaming as an additive path; do not break the blocking contract.

When streaming is unavailable, the frontend:

1. Uses the blocking POST.
2. Persists a local pending-run marker.
3. On refresh, polls `GET /api/sessions/{session_id}/messages` for the matching user/assistant pair (user message is already committed server-side).

Once streaming ships, the frontend prefers stream → active run → reattach, and only falls back to blocking on 404/405/501. A `503` is treated as a retryable turn error (stream capability stays enabled). Negative stream-capability cache expires so clients re-probe after the backend ships.

## Optional: workspace `ui_state` blob

Today `PATCH /api/workspaces/{id}/state` accepts only:

- `last_active_session_id`
- `last_active_dataset_id`

For cross-device UI preference sync (beyond local-first `uiMemory`), consider an optional additive field:

```json
{
  "last_active_session_id": "...",
  "last_active_dataset_id": "...",
  "ui_state": {}
}
```

`ui_state` would be a shallow-merged JSONB blob on `WorkspaceMember`. **Optional** — the frontend Part 2 is localStorage-first and does not require this field to ship.

## Reference implementation

Public help SSE is the template:

- Route: `POST /api/public/help/sessions/{session_id}/messages` → `StreamingResponse` (`text/event-stream`)
- Framing: `event: {name}\ndata: {json}\n\n`
- Persist user message before stream; persist assistant after; end with `done` / `error`

See `backend-engine/app/api/public_help.py` and `backend-engine/app/agents/platform_help/service.py`.

## Frontend consumer (this repo)

| Module                          | Role                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `src/services/chatStreamApi.ts` | `startChatRun`, `attachChatRun`, `getActiveRun`, `getRunStatus`, `cancelRun` |
| `src/lib/chatRunMemory.ts`      | Durable `PersistedChatRun` in localStorage (24h TTL)                         |
| `src/hooks/useChatRun.ts`       | Send / cancel / reattach / legacy fallback                                   |
| `src/lib/sseStreamReader.ts`    | `readSseRequest` (GET/POST, `id:` / lastSeq)                                 |
