#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const endpoint = process.env.SIGNAL_CONTROL_ENDPOINT ?? "http://127.0.0.1:4173/api/control/execute"

const callSignal = async (operation, args = {}) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation, arguments: args }),
  })
  const body = await response.json()
  if (!response.ok || !body.ok) throw new Error(body.error ?? `Signal API returned ${response.status}`)
  return body.result
}

const result = (value) => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  structuredContent: value && typeof value === "object" ? value : { value },
})

const server = new McpServer({ name: "signal-daw", version: "1.0.0" })

server.registerTool(
  "signal_get_project",
  { description: "Read the live Signal project, transport, tracks, mute/solo state, and every MIDI note." },
  async () => result(await callSignal("get_state")),
)

server.registerTool(
  "signal_new_project",
  {
    description: "Create a new empty Signal MIDI project in the connected browser.",
    inputSchema: { name: z.string().optional() },
  },
  async (args) => result(await callSignal("new_project", args)),
)

server.registerTool(
  "signal_add_track",
  {
    description: "Add a MIDI track and select it. MIDI channels are zero-based (0-15; drums normally use 9).",
    inputSchema: {
      name: z.string().optional(),
      channel: z.number().int().min(0).max(15).optional(),
    },
  },
  async (args) => result(await callSignal("add_track", args)),
)

server.registerTool(
  "signal_update_track",
  {
    description: "Rename a track or change its channel, GM program, volume, and pan.",
    inputSchema: {
      trackId: z.number().int(),
      name: z.string().optional(),
      channel: z.number().int().min(0).max(15).optional(),
      program: z.number().int().min(0).max(127).optional(),
      volume: z.number().int().min(0).max(127).optional(),
      pan: z.number().int().min(0).max(127).optional(),
    },
  },
  async (args) => result(await callSignal("update_track", args)),
)

server.registerTool(
  "signal_add_notes",
  {
    description: "Add one or more MIDI notes to a track. Tick positions use the project's timebase (normally 480 ticks per quarter note).",
    inputSchema: {
      trackId: z.number().int(),
      notes: z.array(
        z.object({
          tick: z.number().int().min(0),
          duration: z.number().int().positive(),
          noteNumber: z.number().int().min(0).max(127),
          velocity: z.number().int().min(1).max(127).optional(),
        }),
      ),
    },
  },
  async (args) => result(await callSignal("add_notes", args)),
)

server.registerTool(
  "signal_edit_notes",
  {
    description: "Update, delete, duplicate, transpose, or quantize MIDI notes.",
    inputSchema: {
      action: z.enum(["update", "delete", "duplicate", "transpose", "quantize"]),
      trackId: z.number().int(),
      noteIds: z.array(z.number().int()).optional(),
      notes: z.array(z.object({
        id: z.number().int(),
        tick: z.number().int().min(0).optional(),
        duration: z.number().int().positive().optional(),
        noteNumber: z.number().int().min(0).max(127).optional(),
        velocity: z.number().int().min(1).max(127).optional(),
      })).optional(),
      deltaTick: z.number().int().optional(),
      semitones: z.number().int().optional(),
      gridTicks: z.number().int().positive().optional(),
    },
  },
  async ({ action, ...args }) => {
    const operations = {
      update: "update_notes",
      delete: "delete_notes",
      duplicate: "duplicate_notes",
      transpose: "transpose_notes",
      quantize: "quantize_notes",
    }
    return result(await callSignal(operations[action], args))
  },
)

server.registerTool(
  "signal_set_musical_settings",
  {
    description: "Set tempo, time signature, or project metadata.",
    inputSchema: {
      kind: z.enum(["tempo", "time_signature", "project"]),
      bpm: z.number().positive().max(999).optional(),
      numerator: z.number().int().positive().optional(),
      denominator: z.number().int().positive().optional(),
      tick: z.number().int().min(0).optional(),
      name: z.string().optional(),
      timebase: z.number().int().positive().optional(),
    },
  },
  async ({ kind, ...args }) => {
    const operation = kind === "tempo" ? "set_tempo" : kind === "time_signature" ? "set_time_signature" : "set_project"
    return result(await callSignal(operation, args))
  },
)

server.registerTool(
  "signal_transport",
  {
    description: "Play, pause, stop, seek, start MIDI recording, or stop recording in Signal.",
    inputSchema: {
      action: z.enum(["play", "pause", "stop", "seek", "record", "stop_recording"]),
      tick: z.number().int().min(0).optional(),
    },
  },
  async (args) => result(await callSignal("transport", args)),
)

server.registerTool(
  "signal_track_state",
  {
    description: "Mute, unmute, solo, unsolo, select, duplicate, or delete a MIDI track. Mute and solo take effect immediately.",
    inputSchema: {
      action: z.enum(["mute", "unmute", "solo", "unsolo", "select", "duplicate", "delete"]),
      trackId: z.number().int(),
    },
  },
  async ({ action, trackId }) => {
    if (action === "mute" || action === "unmute") return result(await callSignal("set_mute", { trackId, muted: action === "mute" }))
    if (action === "solo" || action === "unsolo") return result(await callSignal("set_solo", { trackId, solo: action === "solo" }))
    return result(await callSignal(`${action}_track`, { trackId }))
  },
)

server.registerTool(
  "signal_history",
  {
    description: "Undo or redo the latest Signal project edit.",
    inputSchema: { action: z.enum(["undo", "redo"]) },
  },
  async ({ action }) => result(await callSignal(action)),
)

server.registerTool(
  "signal_import_midi",
  {
    description: "Import a local .mid file into the connected Signal browser project.",
    inputSchema: { filePath: z.string(), name: z.string().optional() },
  },
  async ({ filePath, name }) => {
    const bytes = await readFile(resolve(filePath))
    return result(await callSignal("import_midi", { base64: bytes.toString("base64"), name }))
  },
)

server.registerTool(
  "signal_export_midi",
  {
    description: "Export the connected Signal project to a local .mid file.",
    inputSchema: { filePath: z.string() },
  },
  async ({ filePath }) => {
    const exported = await callSignal("export_midi")
    const outputPath = resolve(filePath)
    await writeFile(outputPath, Buffer.from(exported.base64, "base64"))
    return result({ filePath: outputPath, name: exported.name })
  },
)

server.registerTool(
  "signal_export_audio",
  {
    description: "Render the beginning of the live Signal project through its loaded SoundFont and save it as MP3 or WAV on the Codex computer. Use durationSeconds=180 for the first three minutes. Rendering may take several minutes.",
    inputSchema: {
      filePath: z.string().describe("Absolute or working-directory-relative destination path on the computer running Codex, including .mp3 or .wav."),
      midiFilePath: z
        .string()
        .optional()
        .describe("Optional MIDI file to render directly. When supplied, audio is rendered from this file instead of the current browser project, preventing project-state races after import."),
      format: z.enum(["mp3", "wav"]).describe("Audio container and encoder to use."),
      durationSeconds: z.number().positive().max(3600).describe("Exact duration to render from project time zero, in seconds. Use 180 for three minutes."),
      sampleRate: z
        .union([z.literal(22050), z.literal(44100), z.literal(48000)])
        .default(44100)
        .describe("Output sample rate in Hz."),
      bitrateKbps: z
        .union([
          z.literal(96),
          z.literal(128),
          z.literal(192),
          z.literal(256),
          z.literal(320),
        ])
        .default(128)
        .describe("MP3 bitrate in kilobits per second; ignored for WAV."),
    },
    annotations: {
      title: "Export Signal audio",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ filePath, midiFilePath, ...args }) => {
    if (midiFilePath !== undefined) {
      const midiBytes = await readFile(resolve(midiFilePath))
      args.midiBase64 = midiBytes.toString("base64")
    }
    const exported = await callSignal("export_audio", args)
    const outputPath = resolve(filePath)
    await writeFile(outputPath, Buffer.from(exported.base64, "base64"))
    return result({
      filePath: outputPath,
      name: exported.name,
      format: exported.format,
      durationSeconds: exported.durationSeconds,
      sampleRate: exported.sampleRate,
      bitrateKbps: exported.bitrateKbps,
      byteLength: exported.byteLength,
    })
  },
)

server.registerTool(
  "signal_execute",
  {
    description: "Advanced escape hatch for Signal operations. Supported operations: get_state, new_project, import_midi, export_midi, export_audio, set_project, add_track, duplicate_track, delete_track, update_track, add_notes, update_notes, delete_notes, duplicate_notes, transpose_notes, quantize_notes, set_tempo, set_time_signature, set_mute, set_solo, select_track, transport, undo, redo.",
    inputSchema: { operation: z.string(), arguments: z.record(z.string(), z.unknown()).optional() },
  },
  async ({ operation, arguments: args }) => result(await callSignal(operation, args)),
)

await server.connect(new StdioServerTransport())
