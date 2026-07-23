import { describe, expect, it } from "vitest"
import { createTrackControlEditor } from "../testUtils"
import { getItemById, getItems, getValueEventType } from "./primitives"

describe("control editor primitive queries", () => {
  it("getItems lists all items of the editor's type", () => {
    const editor = createTrackControlEditor()
    editor.addItems([
      { tick: 10, value: 64 },
      { tick: 20, value: 100 },
    ])

    expect(editor.query(getItems)).toStrictEqual(editor.getItems())
  })

  it("getItemById returns the matching item, or undefined", () => {
    const editor = createTrackControlEditor()
    const [added] = editor.addItems([{ tick: 10, value: 64 }])

    expect(editor.query(getItemById(added.id))).toStrictEqual(added)
    expect(editor.query(getItemById(-1))).toBeUndefined()
  })

  it("getValueEventType returns the editor's own ValueEventType", () => {
    const editor = createTrackControlEditor({
      type: "controller",
      controllerType: 7,
    })

    expect(editor.query(getValueEventType)).toStrictEqual({
      type: "controller",
      controllerType: 7,
    })
  })
})
