# Signal MCP control

This fork includes a local control API and an MCP server. Commands are executed
inside the open Signal browser tab, so the UI, player, synthesizer, undo history,
mute/solo state, and MCP all operate on the same live project.

## Start

```sh
npm run build
npm run serve:control
```

The server prints a paired browser URL containing a one-time local control token.
Open that URL in the browser that should be controlled. The token is removed from
the address bar and retained in that tab's session storage.

The control API only accepts command submission from the local computer. Browser
polling and results require the token stored in `.signal-control-token`.

## Codex MCP registration

The MCP server can be registered with Codex using:

```sh
codex mcp add signal-daw -- node "$PWD/tools/signal-mcp-server.mjs"
```

It is already registered on this computer as `signal-daw`. A newly started Codex
session discovers its 14 tools automatically.

## Supported operations

- Read the complete live project, including every MIDI note and transport state.
- Create projects; import and export Standard MIDI files.
- Render an exact duration from the beginning of a project to MP3 or WAV.
- Add, rename, configure, duplicate, select, and delete MIDI tracks.
- Set MIDI channel, General MIDI program, volume, and pan.
- Add, update, delete, duplicate, transpose, and quantize notes.
- Set project name, PPQ/timebase, tempo events, and time signatures.
- Play, pause, stop, seek, start recording, and stop recording.
- Mute and solo tracks immediately, including stopping already sounding notes.
- Undo and redo edits.
- Use `signal_execute` for the underlying operation API when a dedicated tool is
  not convenient.

## Verification

```sh
npm run test:mcp
```

The integration test starts an MCP client, creates a project and track, writes
three notes, verifies immediate mute/unmute, exports a MIDI file, imports it
again, and checks that the notes and tempo survived the round trip.
