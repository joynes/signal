import { flow, min } from "lodash"
import { SetTempoEvent } from "midifile-ts"
import { filter, isNotUndefined } from "../../../helpers"
import { TempoEventsClipboardData } from "../../clipboard/clipboardTypes"
import { isNoteEvent, isSetTempoEvent } from "../../event/identify"
import { NoteEvent, TrackEvent, TrackEventOf } from "../../event/TrackEvent"

interface ReadOnlyTrackEvents {
  get(id: number): TrackEvent | undefined
}

type TrackEventsQuery<T> = (events: ReadOnlyTrackEvents) => T

export const getEventsByIds =
  (ids: number[]): TrackEventsQuery<readonly TrackEvent[]> =>
  (events) =>
    ids.map((id) => events.get(id)).filter(isNotUndefined)

export const getNotesByIds = (
  ids: number[],
): TrackEventsQuery<readonly NoteEvent[]> =>
  flow(getEventsByIds(ids), filter(isNoteEvent))

export const getSetTempoEventsByIds = (
  ids: number[],
): TrackEventsQuery<readonly TrackEventOf<SetTempoEvent>[]> =>
  flow(getEventsByIds(ids), filter(isSetTempoEvent))

export const copyTempoEvents =
  (eventIds: number[]): TrackEventsQuery<TempoEventsClipboardData | null> =>
  (events) => {
    const tempoEvents = getSetTempoEventsByIds(eventIds)(events)

    const minTick = min(tempoEvents.map((e) => e.tick))

    if (minTick === undefined) {
      return null
    }

    return {
      type: "tempo_events",
      events: tempoEvents.map((e) => ({ ...e, tick: e.tick - minTick })),
    }
  }
