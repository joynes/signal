import { flow } from "lodash"
import { ControllerEvent, PitchBendEvent } from "midifile-ts"
import { filter } from "../../../helpers"
import { isControllerEvent, isPitchBendEvent } from "../../event"
import { TrackEventOf } from "../../event/TrackEvent"
import { getEventsByIds, TrackEventsQuery } from "./basic"

export const getControllerEventsByIds = (
  ids: readonly number[],
): TrackEventsQuery<
  readonly TrackEventOf<ControllerEvent | PitchBendEvent>[]
> =>
  flow(
    getEventsByIds(ids),
    filter((e) => isControllerEvent(e) || isPitchBendEvent(e)),
  )
