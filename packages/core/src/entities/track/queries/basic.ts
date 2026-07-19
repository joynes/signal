import { TrackEvent } from "../../event/TrackEvent"

interface ReadOnlyTrackEvents {
  get(id: number): TrackEvent | undefined
  getArray(): readonly TrackEvent[]
}

export type TrackEventsQuery<T> = (events: ReadOnlyTrackEvents) => T

export const getEventById =
  (id: number): TrackEventsQuery<TrackEvent | undefined> =>
  (events) =>
    events.get(id)

export const getAll: TrackEventsQuery<readonly TrackEvent[]> = (events) =>
  events.getArray()
