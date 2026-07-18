import { flow } from "lodash"
import { isEventInRange, map } from "../../../helpers"
import { isNoteEvent, moveEvent } from "../../event"
import { TrackEvent } from "../../event/TrackEvent"
import { Range } from "../../geometry/Range"
import { getNotesDuration, quantizeNote, transposeNote } from "../../note"
import { TrackEventsMutator } from "../Track"
import { addEvents, updateEvents } from "./basic"
import { getNotesByIds } from "./queries"

export const transposeNotes = (
  noteIds: number[],
  deltaPitch: number,
): TrackEventsMutator =>
  flow(getNotesByIds(noteIds), map(transposeNote(deltaPitch)), updateEvents)

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
