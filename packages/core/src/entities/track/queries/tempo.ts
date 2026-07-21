import { flow } from "lodash"
import { SetTempoEvent } from "midifile-ts"
import { filter } from "../../../helpers"
import { isSetTempoEvent, TrackEventOf } from "../../event"
import { TempoItem } from "../../tempo/TempoItem"
import { setTempoEventToTempoItem } from "../../tempo/transform"
import { getAll, getEventById } from "./basic"
import { TrackEventsQuery } from "./type"

export const getSetTempoEvents: TrackEventsQuery<
  readonly TrackEventOf<SetTempoEvent>[]
> = flow(getAll, filter(isSetTempoEvent))

export const getTempoItems: TrackEventsQuery<readonly TempoItem[]> = (events) =>
  getSetTempoEvents(events).map(setTempoEventToTempoItem)

export const getTempoItemById =
  (id: number): TrackEventsQuery<TempoItem | undefined> =>
  (events) => {
    const event = getEventById(id)(events)
    if (event === undefined || !isSetTempoEvent(event)) {
      return undefined
    }

    return setTempoEventToTempoItem(event)
  }
