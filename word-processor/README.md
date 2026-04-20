# Word Processor Collaboration Foundation

This app is now organized around the workflow you described:

- `owner`: the file creator keeps edit permissions
- `viewer`: one remote viewer can connect at a time, stay read-only, and leave comments

## Current behavior

- The document and comments are stored by a local Node server in `server/data/store.json`.
- Only one owner session and one viewer session can be active at the same time.
- The owner can switch their own UI between edit mode and viewer mode without giving up ownership.
- The viewer stays read-only and can leave comments.
- Real-time websocket collaboration is still optional and can be enabled later with a Yoopta-compatible server.

## Running it for remote access

Start the backend:

```bash
npm run server
```

Start the frontend in a second terminal:

```bash
npm run dev
```

The Vite dev server is configured to listen on `0.0.0.0`, so another device on the same network can open:

```text
http://YOUR-MACHINE-IP:5173
```

The backend listens on port `4000` and the frontend proxies `/api` requests to it.

If you see `Bad Gateway` when joining, the backend server is not running or not reachable on port `4000`. Verify this first:

```bash
http://127.0.0.1:4000/api/health
```

That endpoint should return:

```json
{"ok":true}
```

## Realtime setup hook

Create a `.env` file from `.env.example` and set:

```bash
VITE_COLLAB_SERVER_URL=ws://localhost:4000
```

When that value is present, the editor shell is ready to connect to a Yoopta-compatible websocket collaboration server.

## Owner access

The local server uses this default owner key unless you override it with an environment variable:

```text
creator-key
```

You can change it when starting the backend:

```bash
$env:COLLAB_OWNER_KEY="my-secret-key"; npm run server
```

## Important files

- `src/App.tsx`: collaboration workspace shell
- `src/editor/session/sessionApi.ts`: owner/viewer session claiming and heartbeats
- `src/editor/components/CollaborativeEditorShell.tsx`: editor surface with optional realtime transport
- `src/editor/documents/documentApi.ts`: document persistence
- `src/editor/comments/commentsApi.ts`: viewer comment persistence
- `src/editor/collaboration/config.ts`: runtime collaboration config
- `server/index.mjs`: shared document server and single-viewer locking

## Next backend step

To move from setup to true multi-user collaboration, add:

1. A websocket server compatible with `@yoopta/collaboration`
2. Authentication stronger than the simple owner key
3. Persistent database storage instead of the local JSON file
