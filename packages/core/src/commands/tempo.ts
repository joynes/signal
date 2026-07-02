import { clamp, min } from "lodash"
import { SetTempoEvent } from "midifile-ts"
import {
  isSetTempoEvent,
  isTimeSignatureEvent,
  Measure,
  Song,
  TempoEventsClipboardData,
  TrackEvent,
  TrackEventOf,
  TrackEvents,
  TrackEventsMutator,
} from "../entities"
import { bpmToUSecPerBeat, uSecPerBeatToBPM } from "../helpers"
import { isNotUndefined } from "../helpers/array"
import { timeSignatureMidiEvent } from "../midi"

export const moveTempoEvents =
  (
    eventIds: number[],
    deltaTick: number,
    deltaValue: number,
    maxBPM: number,
  ): TrackEventsMutator =>
  (events) => {
    const tempoEvents = eventIds
      .map((id) => events.get(id) as unknown as TrackEventOf<SetTempoEvent>)
      .filter(isNotUndefined)

    TrackEvents.updateEvents(
      tempoEvents.map((ev) => ({
        id: ev.id,
        tick: Math.max(0, Math.floor(ev.tick + deltaTick)),
        microsecondsPerBeat: Math.floor(
          bpmToUSecPerBeat(
            clamp(
              uSecPerBeatToBPM(ev.microsecondsPerBeat) + deltaValue,
              0,
              maxBPM,
            ),
          ),
        ),
      })),
    )(events)
  }

export const copyTempoEvents =
  (eventIds: number[]): TrackEventsMutator<TempoEventsClipboardData | null> =>
  (events) => {
    const tempoEvents = events
      .getArray()
      .filter(isSetTempoEvent)
      .filter((e) => eventIds.includes(e.id))

    const minTick = min(tempoEvents.map((e) => e.tick))

    if (minTick === undefined) {
      return null
    }

    return {
      type: "tempo_events",
      events: tempoEvents.map((e) => ({ ...e, tick: e.tick - minTick })),
    }
  }

export const pasteTempoEventsAt =
  (data: TempoEventsClipboardData, tick: number): TrackEventsMutator =>
  (events) => {
    data.events
      .map((e) => ({ ...e, tick: e.tick + tick }))
      .forEach((e) => TrackEvents.createOrUpdate(e)(events))
  }

export const getMeasureStartTick = (song: Song) => (tick: number) => {
  const { timebase, measures } = song
  return Measure.getMeasureStart(measures, tick, timebase).tick
}

export const hasTimeSignatureAt =
  (tick: number): TrackEventsMutator<boolean> =>
  (events) =>
    events
      .getArray()
      .filter(isTimeSignatureEvent)
      .some((e) => e.tick === tick)

export const addTimeSignature =
  (
    tick: number,
    numerator: number,
    denominator: number,
  ): TrackEventsMutator<TrackEvent> =>
  (events) =>
    TrackEvents.addEvent({
      ...timeSignatureMidiEvent(0, numerator, denominator),
      tick,
    })(events)
