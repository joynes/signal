import { describe, expect, it } from "vitest"
import { createTrackControlEditor } from "../testUtils"
import {
  addControlItem,
  removeControlItem,
  updateControlItem,
} from "./primitives"

describe("control editor primitive mutations", () => {
  it("adds an item", () => {
    const editor = createTrackControlEditor()

    const added = editor.mutate(addControlItem({ tick: 10, value: 64 }))

    expect(added).toMatchObject({ tick: 10, value: 64 })
    expect(editor.getItems()).toMatchObject([{ tick: 10, value: 64 }])
  })

  it("removes an item", () => {
    const editor = createTrackControlEditor()
    const [item] = editor.addItems([{ tick: 10, value: 64 }])

    editor.mutate(removeControlItem(item.id))

    expect(editor.getItems()).toStrictEqual([])
  })

  it("updates an item", () => {
    const editor = createTrackControlEditor()
    const [item] = editor.addItems([{ tick: 10, value: 64 }])

    editor.mutate(updateControlItem({ ...item, tick: 20, value: 100 }))

    expect(editor.getItems()).toMatchObject([
      { id: item.id, tick: 20, value: 100 },
    ])
  })
})
