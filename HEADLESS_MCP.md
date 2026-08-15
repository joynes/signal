# Headless Signal MCP

This fork can run Signal's MIDI engine as a standalone MCP server. It does not
start the web application, open a browser, or require a connected UI. The MCP
process owns an in-memory Signal project and can import, edit, render, and export
it directly.

## Start

```sh
npm install
npm run mcp:headless
```

Register it with an MCP client such as Codex:

```sh
codex mcp add signal-headless -- npm --prefix /absolute/path/to/signal run mcp:headless
```

## Deploy with Streamable HTTP

The HTTP mode is UI-free and creates a separate in-memory Signal engine for
each MCP session. A bearer token is mandatory. Local file paths and custom
SoundFont paths are disabled remotely; MIDI can be supplied as base64, and
rendered MP3/WAV files are exposed as authenticated session artifacts.

```sh
docker build -f Dockerfile.mcp -t signal-headless-mcp .
docker run --rm -p 3000:3000 \
  -e SIGNAL_MCP_TOKEN="$(openssl rand -hex 32)" \
  signal-headless-mcp
```

The MCP endpoint is `http://localhost:3000/mcp`. Send the token as
`Authorization: Bearer <token>`. The unauthenticated health endpoint is
`/health`.

Useful deployment settings:

- `PORT` and `HOST` configure the listener (defaults: `3000`, `0.0.0.0`).
- `SIGNAL_SESSION_TTL_MS` controls idle session expiry (default: one hour).
- `SIGNAL_MAX_SESSIONS` caps concurrent in-memory projects (default: 100).
- `SIGNAL_MAX_RENDER_SECONDS` caps each audio render (default: 300 seconds).
- `SIGNAL_MAX_CONCURRENT_RENDERS` caps simultaneous CPU-heavy renders
  (default: 2).
- `SIGNAL_ARTIFACT_DIR` selects ephemeral artifact storage. Mount a volume if
  artifacts must survive container replacement.

Terminate an MCP session with `DELETE /mcp`; its rendered artifacts are then
deleted. Production deployments should put the container behind an HTTPS
reverse proxy and keep the bearer token in the platform's secret store.

## Capabilities

- Read and replace the complete in-memory project.
- Import and export Standard MIDI files.
- Create, update, duplicate, and delete tracks.
- Add, update, delete, duplicate, transpose, and quantize MIDI notes.
- Change project metadata, tempo, time signature, channels, programs, volume,
  and pan.
- Undo and redo edits.
- Render the current project or a specified MIDI file directly to MP3 or WAV.

Audio rendering uses `spessasynth_core`, which runs directly in Node without Web
Audio. The bundled `electron/assets/soundfonts/A320U.sf2` is used by default. A
different SoundFont can be selected with `soundFontPath`.

## Verify

```sh
npm run test:mcp:headless
```

The tests cover MIDI editing and round-trip import/export, undo/redo, and a real
headless MP3 render using the bundled SoundFont.
