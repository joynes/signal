import { ProgramChangeEvent } from "midifile-ts"
import { programChangeMidiEvent } from "../../../midi"
import { TrackEventOf } from "../../event/TrackEvent"
import { findProgramChangeEventAtOrBefore } from "../queries/program"
import { TrackEventsMutator } from "../Track"
import { updateEvent, updateOrAdd } from "./basic"

export const setProgramNumberAt = (
  tick: number,
  programNumber: number,
): TrackEventsMutator<TrackEventOf<ProgramChangeEvent> | null> =>
  updateOrAdd<TrackEventOf<ProgramChangeEvent>>(
    findProgramChangeEventAtOrBefore(tick),
    {
      ...programChangeMidiEvent(0, 0, programNumber),
      tick: 0,
    },
  )

export const setProgramNumberById = (
  eventId: number,
  programNumber: number,
): TrackEventsMutator<TrackEventOf<ProgramChangeEvent> | null> =>
  updateEvent<TrackEventOf<ProgramChangeEvent>>(eventId, {
    value: programNumber,
  })
