import { maxBy, minBy } from "lodash"
import { NoteEvent } from "../track"

export const getNotesDuration = (notes: readonly NoteEvent[]) => {
  const minTick = minBy(notes, (n) => n.tick)?.tick ?? 0
  const maxTick = maxBy(notes, (n) => n.tick + n.duration)?.tick ?? 0
  return maxTick - minTick
}
