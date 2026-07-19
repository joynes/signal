import { isNotUndefined } from "../../../helpers"
import { TrackEvent } from "../../event/TrackEvent"

interface ReadOnlyTrackEvents {
  get(id: number): TrackEvent | undefined
  getArray(): readonly TrackEvent[]
}

export type TrackEventsQuery<T> = (events: ReadOnlyTrackEvents) => T

export const getEventsByIds =
  (ids: readonly number[]): TrackEventsQuery<readonly TrackEvent[]> =>
  (events) =>
    ids.map((id) => events.get(id)).filter(isNotUndefined)

export const getEventsByIdsOrAll =
  (ids: readonly number[]): TrackEventsQuery<readonly TrackEvent[]> =>
  (events) => {
    if (ids.length === 0) {
      return events.getArray()
    }
    return [...getEventsByIds(ids)(events)].sort((a, b) => a.tick - b.tick)
  }
