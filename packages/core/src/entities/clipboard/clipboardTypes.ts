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

export const ControlItemClipboardDataSchema = z.object({
  id: z.number(),
  tick: z.number(),
  value: z.number(),
})

export const ValueEventTypeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pitchBend") }),
  z.object({ type: z.literal("controller"), controllerType: z.number() }),
])

export const ControlEventsClipboardDataSchema = z.object({
  type: z.literal("control_events"),
  valueEventType: ValueEventTypeSchema,
  events: z.array(ControlItemClipboardDataSchema),
})

export type ControlEventsClipboardData = z.infer<
  typeof ControlEventsClipboardDataSchema
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
