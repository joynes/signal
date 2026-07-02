import { clamp, min } from "lodash"
import { SetTempoEvent } from "midifile-ts"
import {
  isSetTempoEvent,
  Measure,
  Song,
  TempoEventsClipboardData,
  Track,
  TrackEventOf,
} from "../entities"
import { bpmToUSecPerBeat, uSecPerBeatToBPM } from "../helpers"
import { isNotUndefined } from "../helpers/array"
import { timeSignatureMidiEvent } from "../midi"

export const moveTempoEvents =
  (conductorTrack: Track) =>
  (
    eventIds: number[],
    deltaTick: number,
    deltaValue: number,
    maxBPM: number,
  ) => {
    const events = eventIds
      .map(
        (id) =>
          conductorTrack.getEventById(
            id,
          ) as unknown as TrackEventOf<SetTempoEvent>,
      )
      .filter(isNotUndefined)

    conductorTrack.updateEvents(
      events.map((ev) => ({
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
    )
  }

export const copyTempoEvents =
  (conductorTrack: Track) =>
  (eventIds: number[]): TempoEventsClipboardData | null => {
    // Copy selected events
    const events = eventIds
      .map((id) => conductorTrack.getEventById(id))
      .filter(isNotUndefined)
      .filter(isSetTempoEvent)

    const minTick = min(events.map((e) => e.tick))

    if (minTick === undefined) {
      return null
    }

    const relativePositionedEvents = events.map((note) => ({
      ...note,
      tick: note.tick - minTick,
    }))

    return {
      type: "tempo_events",
      events: relativePositionedEvents,
    }
  }

export const pasteTempoEventsAt =
  (conductorTrack: Track) => (data: TempoEventsClipboardData, tick: number) => {
    const events = data.events.map((e) => ({
      ...e,
      tick: e.tick + tick,
    }))
    conductorTrack.transaction(() => {
      events.forEach((e) => conductorTrack.createOrUpdate(e))
    })
  }

export const getMeasureStartTick = (song: Song) => (tick: number) => {
  const { timebase, measures } = song
  return Measure.getMeasureStart(measures, tick, timebase).tick
}

export const hasTimeSignatureAt = (conductorTrack: Track) => (tick: number) => {
  const { timeSignatureEvents } = conductorTrack
  return timeSignatureEvents.some((e) => e.tick === tick)
}

export const addTimeSignature =
  (conductorTrack: Track) =>
  (tick: number, numerator: number, denominator: number) => {
    return conductorTrack.addEvent({
      ...timeSignatureMidiEvent(0, numerator, denominator),
      tick,
    })
  }
