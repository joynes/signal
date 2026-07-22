import { describe, expect, it } from "vitest"
import { createSongTempoEditor } from "../testUtils"
import { addItem, removeItem, updateItem } from "./primitives"

describe("tempo editor primitive mutations", () => {
  it("adds an item", () => {
    const editor = createSongTempoEditor()

    const added = editor.mutate(addItem({ tick: 10, bpm: 120 }))

    expect(added).toMatchObject({ tick: 10, bpm: 120 })
    expect(editor.getItems()).toMatchObject([{ tick: 10, bpm: 120 }])
  })

  it("removes an item", () => {
    const editor = createSongTempoEditor([{ tick: 10, bpm: 120 }])
    const [item] = editor.getItems()

    editor.mutate(removeItem(item.id))

    expect(editor.getItems()).toStrictEqual([])
  })

  it("updates an item", () => {
    const editor = createSongTempoEditor([{ tick: 10, bpm: 120 }])
    const [item] = editor.getItems()

    editor.mutate(updateItem({ ...item, tick: 20, bpm: 150 }))

    expect(editor.getItems()).toMatchObject([
      { id: item.id, tick: 20, bpm: 150 },
    ])
  })
})
