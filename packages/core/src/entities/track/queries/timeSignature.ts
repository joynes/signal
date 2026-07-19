import { flow } from "lodash"
import { filter, some } from "../../../helpers"
import { isTimeSignatureEvent } from "../../event"
import { getAll, TrackEventsQuery } from "./basic"

export const hasTimeSignatureAt = (tick: number): TrackEventsQuery<boolean> =>
  flow(
    getAll,
    filter(isTimeSignatureEvent),
    some((e) => e.tick === tick),
  )
