import { NoteEvent } from "../track"
import { NoteNumber } from "../unit"

export type NoteTransform = (note: NoteEvent) => NoteEvent

export const quantizeNote =
  (quantizeRound: (tick: number) => number): NoteTransform =>
  (note) => ({
    ...note,
    tick: quantizeRound(note.tick),
  })

export const transposeNote =
  (deltaPitch: number): NoteTransform =>
  (note) => ({
    ...note,
    noteNumber: NoteNumber.clamp(note.noteNumber + deltaPitch),
  })
