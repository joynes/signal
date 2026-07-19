import { TrackEvent } from "../../event/TrackEvent"
import { ReadonlyTrackEvents } from "../Track"

type QueryTrackEvents = ReadonlyTrackEvents & {
  get(id: number): TrackEvent | undefined
  getArray(): readonly TrackEvent[]
}

const asQueryTrackEvents = (events: ReadonlyTrackEvents): QueryTrackEvents =>
  events as QueryTrackEvents

export type TrackEventsQuery<T> = (events: ReadonlyTrackEvents) => T

export const getEventById =
  (id: number): TrackEventsQuery<TrackEvent | undefined> =>
  (events) =>
    asQueryTrackEvents(events).get(id)

export const getAll: TrackEventsQuery<readonly TrackEvent[]> = (events) =>
  asQueryTrackEvents(events).getArray()
