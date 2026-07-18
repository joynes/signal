import { maxBy, minBy } from "lodash"
import { isNoteEvent, NoteEvent } from "../event"

export const getNotesDuration = (notes: readonly NoteEvent[]) => {
  const minTick = minBy(notes, (n) => n.tick)?.tick ?? 0
  const maxTick = maxBy(notes, (n) => n.tick + n.duration)?.tick ?? 0
  return maxTick - minTick
}

export const sortedNotes = (
  notes: readonly NoteEvent[],
): readonly NoteEvent[] =>
  [...notes.filter(isNoteEvent)].sort((a, b) => {
    if (a.tick < b.tick) {
      return -1
    }
    if (a.tick > b.tick) {
      return 1
    }
    if (a.noteNumber < b.noteNumber) {
      return -1
    }
    if (a.noteNumber > b.noteNumber) {
      return 1
    }
    return 0
  })
