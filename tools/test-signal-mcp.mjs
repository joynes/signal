#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const transport = new StdioClientTransport({
  command: "node",
  args: [new URL("./signal-mcp-server.mjs", import.meta.url).pathname],
})
const client = new Client({ name: "signal-mcp-smoke-test", version: "1.0.0" })

const valueOf = (response) =>
  response.structuredContent ?? JSON.parse(response.content[0].text)

await client.connect(transport)

const tools = await client.listTools()
if (tools.tools.length < 10) throw new Error(`Expected at least 10 tools, found ${tools.tools.length}`)

await client.callTool({
  name: "signal_new_project",
  arguments: { name: "MCP Integration Test" },
})
await client.callTool({
  name: "signal_set_musical_settings",
  arguments: { kind: "tempo", bpm: 132, tick: 0 },
})

const trackResponse = await client.callTool({
  name: "signal_add_track",
  arguments: { name: "AI Piano", channel: 1 },
})
const trackId = valueOf(trackResponse).trackId

const noteResponse = await client.callTool({
  name: "signal_add_notes",
  arguments: {
    trackId,
    notes: [
      { tick: 0, duration: 480, noteNumber: 60, velocity: 100 },
      { tick: 480, duration: 480, noteNumber: 64, velocity: 96 },
      { tick: 960, duration: 960, noteNumber: 67, velocity: 104 },
    ],
  },
})
const noteIds = valueOf(noteResponse).noteIds
if (noteIds.length !== 3) throw new Error("MCP did not create all three notes")

await client.callTool({
  name: "signal_track_state",
  arguments: { action: "mute", trackId },
})
const mutedProject = valueOf(await client.callTool({
  name: "signal_get_project",
  arguments: {},
}))
if (!mutedProject.tracks.find((track) => track.id === trackId)?.muted) {
  throw new Error("Track did not become muted immediately")
}
await client.callTool({
  name: "signal_track_state",
  arguments: { action: "unmute", trackId },
})

const projectResponse = await client.callTool({
  name: "signal_get_project",
  arguments: {},
})
const project = valueOf(projectResponse)
const createdTrack = project.tracks.find((track) => track.id === trackId)
if (project.project.name !== "MCP Integration Test") throw new Error("Project name did not update")
if (createdTrack?.notes.length !== 3) throw new Error("Created track or notes are missing")
if (createdTrack.muted || createdTrack.solo) throw new Error("Mute/solo state did not update immediately")

await client.callTool({
  name: "signal_export_midi",
  arguments: { filePath: "/tmp/signal-mcp-integration-test.mid" },
})
await client.callTool({
  name: "signal_import_midi",
  arguments: {
    filePath: "/tmp/signal-mcp-integration-test.mid",
    name: "MCP Round Trip",
  },
})
const importedProject = valueOf(await client.callTool({
  name: "signal_get_project",
  arguments: {},
}))
if (importedProject.project.name !== "MCP Round Trip") {
  throw new Error("MIDI import did not replace the project")
}
if (importedProject.tracks.flatMap((track) => track.notes).length !== 3) {
  throw new Error("MIDI export/import round trip lost notes")
}
if (Math.round(importedProject.project.tempo) !== 132) {
  throw new Error("MIDI export/import round trip lost the tempo")
}

console.log(JSON.stringify({
  ok: true,
  toolCount: tools.tools.length,
  project: project.project.name,
  trackId,
  noteIds,
  exportedFile: "/tmp/signal-mcp-integration-test.mid",
}))

await client.close()
