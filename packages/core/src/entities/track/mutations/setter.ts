import { SetTempoEvent, TrackNameEvent } from "midifile-ts"
import { bpmToUSecPerBeat } from "../../../helpers/bpm"
import { setTempoMidiEvent, trackNameMidiEvent } from "../../../midi/MidiEvent"
import {
  getColorEvent,
  getTempoEvent,
  getTrackNameEvent,
} from "../../event/selectors"
import {
  createSignalTrackColorEvent,
  SignalTrackColorEvent,
} from "../../event/signalEvents"
import { TrackEventOf } from "../../event/TrackEvent"
import { TrackEventsMutator } from "../Track"
import { TrackColor } from "../TrackColor"
import { updateOrAdd } from "./basic"

export const setTempo = (bpm: number, tick: number): TrackEventsMutator => {
  const microsecondsPerBeat = Math.floor(bpmToUSecPerBeat(bpm))
  return updateOrAdd<TrackEventOf<SetTempoEvent>>(getTempoEvent(tick), {
    ...setTempoMidiEvent(0, microsecondsPerBeat),
    tick: 0,
  })
}

export const setName = (text: string): TrackEventsMutator =>
  updateOrAdd<TrackEventOf<TrackNameEvent>>(getTrackNameEvent, {
    ...trackNameMidiEvent(0, text),
    tick: 0,
  })

export const setColor =
  (color: TrackColor | null): TrackEventsMutator =>
  (events) => {
    if (color === null) {
      const e = getColorEvent(events.getArray())
      if (e !== undefined) {
        events.remove(e.id)
      }
      return
    }
    updateOrAdd<TrackEventOf<SignalTrackColorEvent>>(
      getColorEvent,
      createSignalTrackColorEvent(0, 0, color),
    )(events)
  }
