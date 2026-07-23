import { z } from "zod"

export const PianoNotesClipboardDataSchema = z.object({
  type: z.literal("piano_notes"),
  notes: z.array(z.any()), // NoteEvent[]
})

export type PianoNotesClipboardData = z.infer<
  typeof PianoNotesClipboardDataSchema
>

export const ArrangeEventsClipboardDataSchema = z.object({
  type: z.literal("arrange_events"),
  events: z.record(
    z.union([z.number(), z.string()]).describe("trackIndex"),
    z.array(z.any().describe("TrackEvent")),
  ),
  selectedTrackIndex: z.number(),
})

export type ArrangeEventsClipboardData = z.infer<
  typeof ArrangeEventsClipboardDataSchema
>

export const TempoItemClipboardDataSchema = z.object({
  id: z.number(),
  tick: z.number(),
  bpm: z.number(),
})

export const TempoEventsClipboardDataSchema = z.object({
  type: z.literal("tempo_events"),
  items: z.array(TempoItemClipboardDataSchema),
})

export type TempoEventsClipboardData = z.infer<
  typeof TempoEventsClipboardDataSchema
>
