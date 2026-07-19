import { isEqual, omit } from "lodash"
import { isNotUndefined } from "../../../helpers"
import { getRedundantEvents } from "../../event/selectors"
import { TrackEvent } from "../../event/TrackEvent"
import { validateMidiEvent } from "../../event/validate"
import { TrackEventsMutator } from "../Track"

export const combineMutators =
  <T>(...mutators: readonly TrackEventsMutator<T>[]): TrackEventsMutator<T[]> =>
  (events) => {
    return mutators.map((mutator) => mutator(events))
  }

export const updateEvents = (
  updates: readonly Partial<TrackEvent>[],
): TrackEventsMutator =>
  combineMutators(
    ...updates
      .map((update) => {
        if (update.id !== undefined) {
          return updateEvent(update.id, update)
        }
      })
      .filter(isNotUndefined),
  )

export const removeEvents =
  (ids: readonly number[]): TrackEventsMutator =>
  (events) => {
    ids.forEach((id) => events.remove(id))
  }

export const addEvents = <T extends TrackEvent>(
  newEvents: readonly Omit<T, "id">[],
): TrackEventsMutator<T[]> =>
  combineMutators(
    ...newEvents.map((e) => addEvent<T>(e)).filter(isNotUndefined),
  )

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

export const createOrUpdate =
  <T extends TrackEvent>(
    newEvent: Omit<T, "id"> & { subtype?: string; controllerType?: number },
  ): TrackEventsMutator<T> =>
  (anEvents) => {
    const events = getRedundantEvents(newEvent)(anEvents.getArray())

    if (events.length > 0) {
      events.forEach((e) => {
        updateEvent(e.id, { ...newEvent, id: e.id } as Partial<T>)(anEvents)
      })
      return events[0] as T
    } else {
      return addEvent(newEvent)(anEvents)
    }
  }

export const updateOrAdd =
  <T extends TrackEvent>(
    findEvent: (events: readonly TrackEvent[]) => T | undefined,
    newEvent: Omit<T, "id"> & { subtype?: string; tick?: number },
  ): TrackEventsMutator<T | null> =>
  (events) => {
    const e = findEvent(events.getArray())
    if (e !== undefined) {
      const { tick: _tick, ...update } = newEvent
      return updateEvent<T>(e.id, update as Partial<T>)(events)
    }
    return addEvent<T>(newEvent)(events)
  }
