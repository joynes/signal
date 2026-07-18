import { flow } from "lodash"
import { map } from "../../../helpers"
import { BatchUpdateOperation, batchUpdateNoteVelocity } from "../../note"
import { TrackEventsMutator } from "../Track"
import { updateEvents } from "./basic"
import { getNotesByIds } from "./queries"

export const batchUpdateNotesVelocity = (
  noteIds: number[],
  operation: BatchUpdateOperation,
): TrackEventsMutator =>
  flow(
    getNotesByIds(noteIds),
    map(batchUpdateNoteVelocity(operation)),
    updateEvents,
  )
