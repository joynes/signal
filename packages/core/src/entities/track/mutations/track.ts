import { flow, max, min } from "lodash"
import { AnyEvent } from "midifile-ts"
import { closedRange, isEventInRange, map } from "../../../helpers"
import { getRedundantEvents } from "../../event"
import { isNoteEvent } from "../../event/identify"
import { TrackEvent } from "../../event/TrackEvent"
import { moveEvent } from "../../event/transforms"
import { Range } from "../../geometry/Range"
import { getNotesDuration } from "../../note/selectors"
import { quantizeNote, transposeNote } from "../../note/transforms"
import { TrackEventsMutator } from "../Track"
import {
  addEvents,
  combineMutators,
  createOrUpdate,
  removeEvents,
  updateEvents,
} from "./basic"
import { getEventsByIds, getNotesByIds } from "./queries"

export const transposeNotes = (
  noteIds: number[],
  deltaPitch: number,
): TrackEventsMutator =>
  flow(getNotesByIds(noteIds), map(transposeNote(deltaPitch)), updateEvents)

const getTickSpan = (events: readonly TrackEvent[]) => {
  const minTick = min(events.map((e) => e.tick)) ?? 0
  const maxTick = max(events.map((e) => e.tick)) ?? 0
  return maxTick - minTick
}

export const duplicateEvents =
  (eventIds: number[]): TrackEventsMutator<number[]> =>
  (events) => {
    const selectedEvents = getEventsByIds(eventIds)(events)

    // move to the end of selection
    const deltaTick = getTickSpan(selectedEvents)

    const newEvents = selectedEvents.map(moveEvent(deltaTick))

    return combineMutators(...newEvents.map((e) => createOrUpdate(e)))(
      events,
    ).map((e) => e.id)
  }

// duplicate notes with an optional deltaTick
// if deltaTick is 0, duplicate to the right of the selected notes
export const duplicateNotes =
  (
    noteIds: number[],
    initialDeltaTick: number,
  ): TrackEventsMutator<{ addedNoteIds: number[]; deltaTick: number }> =>
  (events) => {
    const selectedNotes = getNotesByIds(noteIds)(events)

    const deltaTick =
      initialDeltaTick === 0
        ? getNotesDuration(selectedNotes)
        : initialDeltaTick

    const notes = selectedNotes.map(moveEvent(deltaTick))

    const addedNoteIds = addEvents(notes)(events).map((e) => e.id)

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

    const notes =
      selectedNoteIds.length > 0
        ? getNotesByIds(selectedNoteIds)(events)
        : events.getArray().filter(isNoteEvent)

    const eventsToUpdate = notes.filter(
      isEventInRange(Range.create(minTick, maxTick)),
    )

    updateEvents(
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
    const eventsIdsToRemove = getRedundantEvents(event)(events.getArray())
      .filter((e) => e.id !== event.id)
      .map((e) => e.id)
    removeEvents(eventsIdsToRemove)(events)
  }

export const removeRedundantEventsForEventIds =
  (eventIds: number[]): TrackEventsMutator =>
  (events) => {
    const controllerEvents = getEventsByIds(eventIds)(events)
    combineMutators(...controllerEvents.map(removeRedundantEvents))(events)
  }

const quantizedNotes = (
  noteIds: number[],
  quantizeRound: (tick: number) => number,
) => flow(getNotesByIds(noteIds), map(quantizeNote(quantizeRound)))

export const quantizeNotes =
  (
    noteIds: number[],
    quantizeRound: (tick: number) => number,
  ): TrackEventsMutator =>
  (events) => {
    const notes = quantizedNotes(noteIds, quantizeRound)(events)
    updateEvents(notes)(events)
  }

const interpolate = (
  startValue: number,
  endValue: number,
  startTick: number,
  endTick: number,
  easing: (t: number) => number,
) =>
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

    const getValue = interpolate(
      startValue,
      endValue,
      startTick,
      endTick,
      easing,
    )

    const filteredEvents = events
      .getArray()
      .filter(filterEvent)
      .filter(
        (e) =>
          e.tick !== startTick &&
          e.tick >= Math.min(minTick, _startTick) &&
          e.tick <= Math.max(maxTick, _endTick),
      )

    removeEvents(filteredEvents.map((e) => e.id))(events)

    const values = closedRange(_startTick, _endTick, quantizeUnit)
    const eventsToAdd = values.map((tick) => ({
      ...createEvent(getValue(tick)),
      tick,
    }))

    addEvents(eventsToAdd)(events)
  }

const linearEasing = (t: number) => t

// Update  events in the range with linear interpolation values
export const updateEventsInRange = (
  filterEvent: (e: TrackEvent) => boolean,
  createEvent: (value: number) => AnyEvent,
  quantizeFloor: (tick: number) => number,
  quantizeUnit: number,
  startValue: number,
  endValue: number,
  startTick: number,
  endTick: number,
): TrackEventsMutator =>
  updateEventsInRangeWithEasing(
    filterEvent,
    createEvent,
    quantizeFloor,
    quantizeUnit,
    startValue,
    endValue,
    startTick,
    endTick,
    linearEasing,
  )
