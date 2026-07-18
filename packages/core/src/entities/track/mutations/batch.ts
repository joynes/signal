import { clamp, flow } from "lodash"
import { map } from "../../../helpers"
import { NoteEvent } from "../../event/TrackEvent"
import { TrackEventsMutator } from "../Track"
import { updateEvents } from "./basic"
import { getNotesByIds } from "./queries"

const applyOperation = (operation: BatchUpdateOperation, value: number) => {
  switch (operation.type) {
    case "set":
      return operation.value
    case "add":
      return value + operation.value
    case "multiply":
      return value * operation.value
  }
}

export interface BatchUpdateOperation {
  readonly type: "set" | "add" | "multiply"
  readonly value: number
}

const batchUpdateNoteVelocity =
  (operation: BatchUpdateOperation) =>
  (note: NoteEvent): NoteEvent => ({
    ...note,
    velocity: clamp(
      Math.floor(applyOperation(operation, note.velocity)),
      1,
      127,
    ),
  })

export const batchUpdateNotesVelocity = (
  noteIds: number[],
  operation: BatchUpdateOperation,
): TrackEventsMutator =>
  flow(
    getNotesByIds(noteIds),
    map(batchUpdateNoteVelocity(operation)),
    updateEvents,
  )
