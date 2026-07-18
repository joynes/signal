import { flow, min } from "lodash"
import { SetTempoEvent } from "midifile-ts"
import { filter, isNotUndefined } from "../../helpers"
import {
  PianoNotesClipboardData,
  TempoEventsClipboardData,
} from "../clipboard/clipboardTypes"
import { isNoteEvent, isSetTempoEvent } from "../event/identify"
import { NoteEvent, TrackEvent, TrackEventOf } from "../event/TrackEvent"
import { sortedNotes } from "../note"

interface ReadOnlyTrackEvents {
  get(id: number): TrackEvent | undefined
  getArray(): readonly TrackEvent[]
}

export type TrackEventsQuery<T> = (events: ReadOnlyTrackEvents) => T

export const getEventsByIds =
  (ids: readonly number[]): TrackEventsQuery<readonly TrackEvent[]> =>
  (events) =>
    ids.map((id) => events.get(id)).filter(isNotUndefined)

export const getNotesByIds = (
  ids: readonly number[],
): TrackEventsQuery<readonly NoteEvent[]> =>
  flow(getEventsByIds(ids), filter(isNoteEvent))

export const getSetTempoEventsByIds = (
  ids: readonly number[],
): TrackEventsQuery<readonly TrackEventOf<SetTempoEvent>[]> =>
  flow(getEventsByIds(ids), filter(isSetTempoEvent))

export const tempoEventsToClipboardData =
  (
    eventIds: readonly number[],
  ): TrackEventsQuery<TempoEventsClipboardData | null> =>
  (events) => {
    const tempoEvents = getSetTempoEventsByIds(eventIds)(events)

    const minTick = min(tempoEvents.map((e) => e.tick))

    if (minTick === undefined) {
      return null
    }

    return {
      type: "tempo_events",
      events: tempoEvents.map((e) => ({ ...e, tick: e.tick - minTick })),
    }
  }

export const notesToClipboardData =
  (
    noteIds: readonly number[],
    startTick?: number,
  ): TrackEventsQuery<PianoNotesClipboardData | null> =>
  (events) => {
    const notes = getNotesByIds(noteIds)(events)

    const minTick = startTick ?? min(notes.map((e) => e.tick))

    if (minTick === undefined) {
      return null
    }

    return {
      type: "piano_notes",
      notes: notes.map((e) => ({ ...e, tick: e.tick - minTick })),
    }
  }

export const getAllNoteIds =
  (): TrackEventsQuery<readonly number[]> => (events) =>
    events
      .getArray()
      .filter(isNoteEvent)
      .map((e) => e.id)

export const getNeighborNote =
  (
    deltaIndex: number,
    selectedNoteIds: readonly number[],
  ): TrackEventsQuery<NoteEvent | null> =>
  (events) => {
    if (selectedNoteIds.length === 0) {
      return null
    }
    const allNotes = events.getArray().filter(isNoteEvent)
    const selectedNotes = sortedNotes(getNotesByIds(selectedNoteIds)(events))
    if (selectedNotes.length === 0) {
      return null
    }
    const firstNote = sortedNotes(selectedNotes)[0]
    const notes = sortedNotes(allNotes)
    const currentIndex = notes.findIndex((n) => n.id === firstNote.id)
    const nextNote = notes[currentIndex + deltaIndex]
    return nextNote ?? null
  }
