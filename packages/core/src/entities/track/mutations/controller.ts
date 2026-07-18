import { ControllerEvent } from "midifile-ts"
import { isControllerEventWithType } from "../../event/identify"
import { getLast, isTickBefore } from "../../event/selectors"
import { TrackEventOf } from "../../event/TrackEvent"
import { TrackEventsMutator } from "../Track"
import { updateOrAdd } from "./basic"

const setControllerValue = (
  controllerType: number,
  tick: number,
  value: number,
): TrackEventsMutator =>
  updateOrAdd<TrackEventOf<ControllerEvent>>(
    (events) =>
      getLast(
        events
          .filter(isControllerEventWithType(controllerType))
          .filter(isTickBefore(tick)),
      ),
    <TrackEventOf<ControllerEvent>>{
      type: "channel",
      subtype: "controller",
      controllerType,
      tick: 0,
      value,
    },
  )

export const setVolume = (value: number, tick: number): TrackEventsMutator =>
  setControllerValue(7, tick, value)

export const setPan = (value: number, tick: number): TrackEventsMutator =>
  setControllerValue(10, tick, value)
