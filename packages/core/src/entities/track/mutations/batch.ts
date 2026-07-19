import { flow } from "lodash"
import { map } from "../../../helpers"
import { BatchUpdateOperation, batchUpdateNoteVelocity } from "../../note"
import { getNotesByIds } from "../queries"
import { TrackEventsMutator } from "../Track"
import { updateEvents } from "./composed"

export const batchUpdateNotesVelocity =
  (
    noteIds: readonly number[],
    operation: BatchUpdateOperation,
  ): TrackEventsMutator =>
  (events) => {
    const updates = flow(
      getNotesByIds(noteIds),
      map(batchUpdateNoteVelocity(operation)),
    )(events)
    return updateEvents(updates)(events)
  }
