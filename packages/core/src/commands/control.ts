import { min } from "lodash"
import { TrackEvents, TrackEventsMutator } from "../entities"
import { ControlEventsClipboardData } from "../entities/clipboard/clipboardTypes"
import { isNotUndefined } from "../helpers"

export const getControlClipboardDataForSelection =
  (eventIds: number[]): TrackEventsMutator<ControlEventsClipboardData | null> =>
  (events) => {
    const controlEvents = eventIds
      .map((id) => events.get(id))
      .filter(isNotUndefined)

    const minTick = min(controlEvents.map((e) => e.tick))

    if (minTick === undefined) {
      return null
    }

    return {
      type: "control_events",
      events: controlEvents.map((e) => ({ ...e, tick: e.tick - minTick })),
    }
  }

export const pasteClipboardDataAtPosition =
  (data: ControlEventsClipboardData, position: number): TrackEventsMutator =>
  (events) => {
    data.events
      .map((e) => ({ ...e, tick: e.tick + position }))
      .forEach((e) => TrackEvents.createOrUpdate(e)(events))
  }
