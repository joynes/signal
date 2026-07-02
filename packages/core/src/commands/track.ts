import { clamp, max, maxBy, min, minBy } from "lodash"
import { AnyEvent } from "midifile-ts"
import {
  isNoteEvent,
  NoteEvent,
  Range,
  TrackEvent,
  TrackEvents,
  TrackEventsMutator,
} from "../entities"
import { NoteNumber } from "../entities/unit/NoteNumber"
import { closedRange, isNotNull, isNotUndefined } from "../helpers/array"
import { isEventInRange } from "../helpers/filterEvents"

export interface BatchUpdateOperation {
  readonly type: "set" | "add" | "multiply"
  readonly value: number
}

export const batchUpdateNotesVelocity =
  (noteIds: number[], operation: BatchUpdateOperation): TrackEventsMutator =>
  (events) => {
    const selectedNotes = noteIds
      .map((id) => events.get(id))
      .filter(isNotUndefined)
      .filter(isNoteEvent)
    TrackEvents.updateEvents(
      selectedNotes.map((note) => ({
        id: note.id,
        velocity: clamp(
          Math.floor(applyOperation(operation, note.velocity)),
          1,
          127,
        ),
      })),
    )(events)
  }

export const transposeNotes =
  (noteIds: number[], deltaPitch: number): TrackEventsMutator =>
  (events) => {
    TrackEvents.updateEvents(
      noteIds
        .map((id) => {
          const n = events.get(id)
          if (n === undefined || !isNoteEvent(n)) {
            return null
          }
          return {
            id,
            noteNumber: NoteNumber.clamp(n.noteNumber + deltaPitch),
          }
        })
        .filter(isNotNull),
    )(events)
  }

export const duplicateEvents =
  (eventIds: number[]): TrackEventsMutator<number[]> =>
  (events) => {
    const selectedEvents = eventIds
      .map((id) => events.get(id))
      .filter(isNotUndefined)

    // move to the end of selection
    const deltaTick =
      (maxBy(selectedEvents, (e) => e.tick)?.tick ?? 0) -
      (minBy(selectedEvents, (e) => e.tick)?.tick ?? 0)

    const newEvents = selectedEvents.map((e) => ({
      ...e,
      tick: e.tick + deltaTick,
    }))

    return newEvents
      .map((e) => TrackEvents.createOrUpdate(e)(events))
      .filter(isNotUndefined)
      .map((e) => e.id)
  }

// duplicate notes with an optional deltaTick
// if deltaTick is 0, duplicate to the right of the selected notes
export const duplicateNotes =
  (
    noteIds: number[],
    initialDeltaTick: number,
  ): TrackEventsMutator<{ addedNoteIds: number[]; deltaTick: number }> =>
  (events) => {
    const selectedNotes = noteIds
      .map((id) => events.get(id))
      .filter(isNotUndefined)
      .filter(isNoteEvent)

    let deltaTick = initialDeltaTick
    if (deltaTick === 0) {
      const left = min(selectedNotes.map((n) => n.tick)) ?? 0
      const right = max(selectedNotes.map((n) => n.tick + n.duration)) ?? 0
      deltaTick = right - left
    }

    const notes = selectedNotes.map((note) => ({
      ...note,
      tick: note.tick + deltaTick,
    }))

    const addedNoteIds = TrackEvents.addEvents(notes)(events).map((e) => e.id)

    return { addedNoteIds, deltaTick }
  }

// update velocities of notes in the specified range using linear interpolation
export const updateVelocitiesInRange =
  (
    selectedNoteIds: number[], // if empty, apply to all notes
    startTick: number,
    startValue: number,
    endTick: number,
    endValue: number,
  ): TrackEventsMutator =>
  (events) => {
    const minTick = Math.min(startTick, endTick)
    const maxTick = Math.max(startTick, endTick)
    const minValue = Math.min(startValue, endValue)
    const maxValue = Math.max(startValue, endValue)
    const getValue = (tick: number) =>
      Math.floor(
        Math.min(
          maxValue,
          Math.max(
            minValue,
            ((tick - startTick) / (endTick - startTick)) *
              (endValue - startValue) +
              startValue,
          ),
        ),
      )

    const allEvents = events.getArray()
    const notes =
      selectedNoteIds.length > 0
        ? selectedNoteIds.map((id) => events.get(id) as NoteEvent)
        : allEvents.filter(isNoteEvent)

    const eventsToUpdate = notes.filter(
      isEventInRange(Range.create(minTick, maxTick)),
    )

    TrackEvents.updateEvents(
      eventsToUpdate.map((e: TrackEvent) => ({
        id: e.id,
        velocity: getValue(e.tick),
      })),
    )(events)
  }

export const removeRedundantEvents =
  <T extends TrackEvent>(
    event: T & { subtype?: string; controllerType?: number },
  ): TrackEventsMutator =>
  (events) => {
    const eventsIdsToRemove = TrackEvents.getRedundantEvents(event)(
      events.getArray(),
    )
      .filter((e) => e.id !== event.id)
      .map((e) => e.id)
    TrackEvents.removeEvents(eventsIdsToRemove)(events)
  }

export const removeRedundantEventsForEventIds =
  (eventIds: number[]): TrackEventsMutator =>
  (events) => {
    const controllerEvents = events
      .getArray()
      .filter((e: TrackEvent) => eventIds.includes(e.id))
    controllerEvents.forEach((e: TrackEvent) =>
      removeRedundantEvents(e)(events),
    )
  }

export const quantizeNotes =
  (
    noteIds: number[],
    quantizeRound: (tick: number) => number,
  ): TrackEventsMutator =>
  (events) => {
    const notes = noteIds
      .map((id) => events.get(id))
      .filter(isNotUndefined)
      .filter(isNoteEvent)
      .map((e) => ({
        ...e,
        tick: quantizeRound(e.tick),
      }))

    TrackEvents.updateEvents(notes)(events)
  }

// Update events in the range with easing interpolation values
export const updateEventsInRangeWithEasing =
  (
    filterEvent: (e: TrackEvent) => boolean,
    createEvent: (value: number) => AnyEvent,
    quantizeFloor: (tick: number) => number,
    quantizeUnit: number,
    startValue: number,
    endValue: number,
    startTick: number,
    endTick: number,
    easing: (t: number) => number,
  ): TrackEventsMutator =>
  (events) => {
    const minTick = Math.min(startTick, endTick)
    const maxTick = Math.max(startTick, endTick)
    const _startTick = quantizeFloor(Math.max(0, minTick))
    const _endTick = quantizeFloor(Math.max(0, maxTick))

    const getValue =
      endTick === startTick
        ? () => endValue
        : (tick: number) => {
            const t = (tick - startTick) / (endTick - startTick)
            const easedT = easing(t)
            const value = startValue + easedT * (endValue - startValue)
            return Math.floor(
              Math.min(
                Math.max(startValue, endValue),
                Math.max(Math.min(startValue, endValue), value),
              ),
            )
          }

    const filteredEvents = events
      .getArray()
      .filter(filterEvent)
      .filter(
        (e) =>
          e.tick !== startTick &&
          e.tick >= Math.min(minTick, _startTick) &&
          e.tick <= Math.max(maxTick, _endTick),
      )

    TrackEvents.removeEvents(filteredEvents.map((e) => e.id))(events)
    TrackEvents.addEvents(
      closedRange(_startTick, _endTick, quantizeUnit).map((tick) => ({
        ...createEvent(getValue(tick)),
        tick,
      })),
    )(events)
  }

// Update  events in the range with linear interpolation values
export const updateEventsInRange =
  (
    filterEvent: (e: TrackEvent) => boolean,
    createEvent: (value: number) => AnyEvent,
    quantizeFloor: (tick: number) => number,
    quantizeUnit: number,
    startValue: number,
    endValue: number,
    startTick: number,
    endTick: number,
  ): TrackEventsMutator =>
  (events) => {
    const minTick = Math.min(startTick, endTick)
    const maxTick = Math.max(startTick, endTick)
    const _startTick = quantizeFloor(Math.max(0, minTick))
    const _endTick = quantizeFloor(Math.max(0, maxTick))

    const minValue = Math.min(startValue, endValue)
    const maxValue = Math.max(startValue, endValue)

    // linear interpolate
    const getValue =
      endTick === startTick
        ? () => endValue
        : (tick: number) =>
            Math.floor(
              Math.min(
                maxValue,
                Math.max(
                  minValue,
                  ((tick - startTick) / (endTick - startTick)) *
                    (endValue - startValue) +
                    startValue,
                ),
              ),
            )

    // Delete events in the dragged area
    const filteredEvents = events
      .getArray()
      .filter(filterEvent)
      .filter(
        (e) =>
          // to prevent remove the event created previously, do not remove the event placed at startTick
          e.tick !== startTick &&
          e.tick >= Math.min(minTick, _startTick) &&
          e.tick <= Math.max(maxTick, _endTick),
      )

    TrackEvents.removeEvents(filteredEvents.map((e) => e.id))(events)
    TrackEvents.addEvents(
      closedRange(_startTick, _endTick, quantizeUnit).map((tick) => ({
        ...createEvent(getValue(tick)),
        tick,
      })),
    )(events)
  }

const applyOperation = (operation: BatchUpdateOperation, value: number) => {
  switch (operation.type) {
    case "set":
      return operation.value
    case "add":
      return value + operation.value
    case "multiply":
      return value * operation.value
  }
}
