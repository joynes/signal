import { describe, expect, it } from "vitest"
import { Range } from "../../../entities/geometry/Range"
import { getItemsByIds } from "../queries/tempo"
import { createSongTempoEditor } from "../testUtils"
import {
  addClipboardTempoEvents,
  createOrUpdateItem,
  duplicateItems,
  moveItems,
  removeItems,
  removeRedundantItems,
  setBpm,
  updateItemsInRange,
} from "./composed"

describe("tempo editor composed mutations", () => {
  it("removes selected items", () => {
    const editor = createSongTempoEditor([
      { tick: 10, bpm: 120 },
      { tick: 20, bpm: 150 },
    ])
    const [first] = editor.getItems()

    editor.mutate(removeItems([first.id]))

    expect(editor.getItems()).toMatchObject([{ tick: 20, bpm: 150 }])
  })

  it("duplicates items using their selection span", () => {
    const editor = createSongTempoEditor([
      { tick: 10, bpm: 100 },
      { tick: 20, bpm: 200 },
    ])
    const selected = editor.getItems()

    const addedIds = editor.mutate(
      duplicateItems(selected.map((item) => item.id)),
    )

    expect(editor.query(getItemsByIds(addedIds))).toMatchObject([
      { tick: 20, bpm: 100 },
      { tick: 30, bpm: 200 },
    ])
  })

  it("pastes clipboard items at the target tick", () => {
    const editor = createSongTempoEditor()

    editor.mutate(
      addClipboardTempoEvents(
        {
          type: "tempo_events",
          items: [
            { id: 1, tick: 0, bpm: 120 },
            { id: 2, tick: 20, bpm: 150 },
          ],
        },
        60,
      ),
    )

    expect(editor.getItems()).toMatchObject([
      { tick: 60, bpm: 120 },
      { tick: 80, bpm: 150 },
    ])
  })

  it("moves selected items and clamps their values", () => {
    const editor = createSongTempoEditor([
      { tick: 10, bpm: 120 },
      { tick: 20, bpm: 180 },
    ])
    const selected = editor.getItems()

    editor.mutate(
      moveItems(
        selected.map((item) => item.id),
        -20,
        30,
        200,
      ),
    )

    expect(editor.getItems()).toMatchObject([
      { tick: 0, bpm: 150 },
      { tick: 0, bpm: 200 },
    ])
  })

  it("removes redundant items at selected ticks", () => {
    const editor = createSongTempoEditor([
      { tick: 10, bpm: 120 },
      { tick: 20, bpm: 150 },
    ])
    const [source] = editor.getItems()
    editor.addItems([{ tick: source.tick, bpm: 160 }])

    editor.mutate(removeRedundantItems([source.id]))

    expect(editor.getItems()).toMatchObject([
      { id: source.id, tick: 10, bpm: 120 },
      { tick: 20, bpm: 150 },
    ])
  })

  it("creates an item or updates all items at the same tick", () => {
    const editor = createSongTempoEditor([{ tick: 10, bpm: 120 }])

    editor.mutate(createOrUpdateItem(10, 150))
    editor.mutate(createOrUpdateItem(20, 200))

    expect(editor.getItems()).toMatchObject([
      { tick: 10, bpm: 150 },
      { tick: 20, bpm: 200 },
    ])
  })

  it("updates tempo items across a quantized range", () => {
    const editor = createSongTempoEditor([
      { tick: 0, bpm: 50 },
      { tick: 10, bpm: 50 },
      { tick: 20, bpm: 50 },
    ])

    editor.mutate(
      updateItemsInRange(
        Range.create(100, 200),
        Range.create(0, 20),
        (tick) => tick,
        10,
      ),
    )

    expect(editor.getItems()).toMatchObject([
      { tick: 0, bpm: 100 },
      { tick: 10, bpm: 150 },
      { tick: 20, bpm: 200 },
    ])
  })

  it("sets BPM only when the item exists", () => {
    const editor = createSongTempoEditor([{ tick: 10, bpm: 120 }])
    const [item] = editor.getItems()

    editor.mutate(setBpm(item.id, 150))
    editor.mutate(setBpm(-1, 180))

    expect(editor.getItems()).toMatchObject([{ tick: 10, bpm: 150 }])
  })
})
