import { isEqual, omit } from "lodash"
import { TrackEvent } from "../../event/TrackEvent"
import { validateMidiEvent } from "../../event/validate"
import { TrackEventsMutator } from "../Track"
import { combineMutators } from "./higherOrder"

export const removeEvent =
  (id: number): TrackEventsMutator =>
  (events) => {
    events.remove(id)
  }

export const removeEvents =
  (ids: readonly number[]): TrackEventsMutator =>
  (events) => {
    combineMutators(...ids.map(removeEvent))(events)
  }

export const updateEvent =
  <T extends TrackEvent>(
    id: number,
    obj: Partial<T>,
  ): TrackEventsMutator<T | null> =>
  (events) => {
    console.log(`updateEvent: ${id}`)
    const anObj = events.get(id)
    if (anObj === undefined) {
      console.warn(`unknown id: ${id}`)
      return null
    }
    const newObj = { ...anObj, ...obj }
    if (isEqual(newObj, anObj)) {
      return null
    }
    events.update(id, newObj)

    if (process.env.NODE_ENV !== "production") {
      validateMidiEvent(newObj)
    }

    return newObj as T
  }

export const addEvent =
  <T extends TrackEvent>(
    e: Omit<T, "id"> & { subtype?: string },
  ): TrackEventsMutator<T> =>
  (events) => {
    if (!("tick" in e) || Number.isNaN(e.tick)) {
      throw new Error("invalid event is added")
    }
    if ("subtype" in e && e.subtype === "endOfTrack") {
      throw new Error("endOfTrack event is added")
    }
    return events.create({
      ...omit(e, ["deltaTime", "channel"]),
    } as T) as T
  }
