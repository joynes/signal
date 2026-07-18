import { TrackEvent } from "./TrackEvent"

type TrackEventTransform<T extends TrackEvent> = (event: T) => T

export const moveEvent =
  <T extends TrackEvent>(deltaTick: number): TrackEventTransform<T> =>
  (event) => ({
    ...event,
    tick: event.tick + deltaTick,
  })
