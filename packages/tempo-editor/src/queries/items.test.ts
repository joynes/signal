import { Range } from "@signal-app/core"
import { describe, expect, it } from "vitest"
import { createTrackTempoEditor } from "../testUtils"
import {
  getEventIdsInRange,
  getItemsByIds,
  getItemsClipboardData,
  listItems,
} from "./items"

describe("tempo editor queries", () => {
  it("lists selected items and event IDs in a range", () => {
    const editor = createTrackTempoEditor([
      { tick: 10, bpm: 120 },
      { tick: 20, bpm: 150 },
    ])
    const items = editor.getItems()

    expect(editor.query(listItems)).toEqual(editor.getItems())
    expect(editor.query(getItemsByIds([items[1].id, items[0].id]))).toEqual([
      items[1],
      items[0],
    ])
    expect(editor.query(getEventIdsInRange(Range.create(10, 21)))).toEqual([
      items[0].id,
      items[1].id,
    ])
  })

  it("copies normalized TempoItems", () => {
    const editor = createTrackTempoEditor([
      { tick: 20, bpm: 120 },
      { tick: 40, bpm: 150 },
    ])
    const items = editor.getItems()

    expect(
      editor.query(getItemsClipboardData(items.map((item) => item.id))),
    ).toMatchObject({
      type: "tempo_events",
      items: [
        { tick: 0, bpm: 120 },
        { tick: 20, bpm: 150 },
      ],
    })
  })
})
