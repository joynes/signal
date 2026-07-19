import { isNotUndefined } from "../../../helpers"
import { getRedundantEvents } from "../../event/selectors"
import { TrackEvent } from "../../event/TrackEvent"
import { TrackEventsMutator } from "../Track"
import { addEvent, removeEvent, updateEvent } from "./basic"
import { combineMutators } from "./higherOrder"

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

export const addEvents = <T extends TrackEvent>(
  newEvents: readonly Omit<T, "id">[],
): TrackEventsMutator<T[]> =>
  combineMutators(
    ...newEvents.map((event) => addEvent<T>(event)).filter(isNotUndefined),
  )

export const removeEvents =
  (ids: readonly number[]): TrackEventsMutator =>
  (events) => {
    combineMutators(...ids.map(removeEvent))(events)
  }

export const createOrUpdate =
  <T extends TrackEvent>(
    newEvent: Omit<T, "id"> & { subtype?: string; controllerType?: number },
  ): TrackEventsMutator<T> =>
  (events) => {
    const redundantEvents = getRedundantEvents(newEvent)(events.getArray())

    if (redundantEvents.length > 0) {
      redundantEvents.forEach((event) => {
        updateEvent(event.id, { ...newEvent, id: event.id } as Partial<T>)(
          events,
        )
      })
      return redundantEvents[0] as T
    }

    return addEvent(newEvent)(events)
  }

export const updateOrAdd =
  <T extends TrackEvent>(
    findEvent: (events: readonly TrackEvent[]) => T | undefined,
    newEvent: Omit<T, "id"> & { subtype?: string; tick?: number },
  ): TrackEventsMutator<T | null> =>
  (events) => {
    const event = findEvent(events.getArray())
    if (event !== undefined) {
      const { tick: _tick, ...update } = newEvent
      return updateEvent<T>(event.id, update as Partial<T>)(events)
    }
    return addEvent<T>(newEvent)(events)
  }
