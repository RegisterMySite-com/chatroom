# html-deploy catalog module

`html-deploy.registermysite.com` fetches this path on deploy:

`https://raw.githubusercontent.com/RegisterMySite-com/chatroom/main/catalog/worker.js`

That file is a **single-file Worker** (`export default { fetch }`) so the orchestrator can publish it without npm, Durable Objects, PartyKit, or the React/esbuild pipeline used by the main app in `src/`.

## Bindings (from the live-chat catalog program)

- `CHAT_KV` — KV namespace for message history
- `ROOM_TITLE` — optional room title (defaults to `Chat`)

## Behavior

- Serves the LiveChat UI at `/`
- WebSocket at `/ws?room=<id>`
- REST at `GET|POST /api/messages?room=<id>`
- Health at `/health`
- Rooms via `?room=lobby` (sanitized)
- Last 200 messages persisted in KV

Live presence is in-isolate (best-effort). History is in KV so a new isolate still has the transcript.

For the full Durable Object + PartyServer app, deploy the repo root with Wrangler (`npm run deploy`), not this catalog file.
