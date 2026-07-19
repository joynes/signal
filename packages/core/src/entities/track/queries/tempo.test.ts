import { describe, expect, it } from "vitest"
import { TickOrderedArray } from "../../../data/OrdererdArray/TickOrderedArray"
import { TrackEvent, TrackEventOf } from "../../event/TrackEvent"
import { addEvent } from "../mutations"
import { getSetTempoEventsWithNextTick } from "./tempo"

describe("track queries/tempo", () => {
  it("returns setTempo events with nextTick in tick order", () => {
    const events = new TickOrderedArray<TrackEvent>()

    const tempoAt10 = addEvent<TrackEventOf<{ type: "meta"; subtype: "setTempo" }>>({
      type: "meta",
      subtype: "setTempo",
      tick: 10,
      microsecondsPerBeat: 500000,
    })(events)
    addEvent({
      type: "meta",
      subtype: "text",
      tick: 20,
      text: "ignored",
    })(events)
    const tempoAt30 = addEvent<TrackEventOf<{ type: "meta"; subtype: "setTempo" }>>({
      type: "meta",
      subtype: "setTempo",
      tick: 30,
      microsecondsPerBeat: 400000,
    })(events)

    const result = getSetTempoEventsWithNextTick(events)

    expect(result).toHaveLength(2)
    expect(result[0].event.id).toBe(tempoAt10.id)
    expect(result[0].nextTick).toBe(30)
    expect(result[1].event.id).toBe(tempoAt30.id)
    expect(result[1].nextTick).toBeUndefined()
  })
})
