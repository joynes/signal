import { SetTempoEvent } from "midifile-ts"
import { describe, expect, it } from "vitest"
import { TickOrderedArray } from "../../../data/OrdererdArray/TickOrderedArray"
import { TrackEvent, TrackEventOf } from "../../event/TrackEvent"
import { addEvent } from "../mutations"
import { getTempoItemById } from "./tempo"

describe("track queries/tempo", () => {
  it("getTempoItemById returns only the requested tempo item", () => {
    const events = new TickOrderedArray<TrackEvent>()
    const tempo = addEvent<TrackEventOf<SetTempoEvent>>({
      type: "meta",
      subtype: "setTempo",
      tick: 10,
      microsecondsPerBeat: 500000,
    })(events)
    const note = addEvent<NoteEvent>({
      type: "channel",
      subtype: "note",
      tick: 12,
      duration: 10,
      noteNumber: 60,
      velocity: 100,
    })(events)

    expect(getTempoItemById(tempo.id)(events)).toStrictEqual({
      id: tempo.id,
      tick: 10,
      bpm: 120,
    })
    expect(getTempoItemById(note.id)(events)).toBeUndefined()
    expect(getTempoItemById(999)(events)).toBeUndefined()
  })

})
