import { ProgramChangeEvent } from "midifile-ts"
import { isProgramChangeEvent } from "../../event"
import { TrackEvent, TrackEventOf } from "../../event/TrackEvent"
import { TrackEventsQuery } from "./basic"

export const findProgramChangeEventAtOrBefore =
  (tick: number) =>
  (
    events: readonly TrackEvent[],
  ): TrackEventOf<ProgramChangeEvent> | undefined => {
    let found: TrackEventOf<ProgramChangeEvent> | undefined

    for (const event of events) {
      if (!isProgramChangeEvent(event) || event.tick > tick) {
        continue
      }
      if (found === undefined || event.tick >= found.tick) {
        found = event
      }
    }

    return found
  }

export const getProgramChangeEventAtOrBefore = (
  tick: number,
): TrackEventsQuery<TrackEventOf<ProgramChangeEvent> | undefined> => {
  const find = findProgramChangeEventAtOrBefore(tick)
  return (events) => find(events.getArray())
}

export const hasProgramChangeEventAfter = (
  tick: number,
): TrackEventsQuery<boolean> => {
  return (events) =>
    events
      .getArray()
      .some((event) => isProgramChangeEvent(event) && event.tick > tick)
}
