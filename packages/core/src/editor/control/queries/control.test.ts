import { describe, expect, it } from "vitest"
import { createTrackControlEditor } from "../testUtils"
import {
  getControlItemsByIds,
  getControlItemsClipboardData,
  getControlItemsInRangeWithPrevious,
  listControlItems,
} from "./control"

describe("control editor composed queries", () => {
  it("listControlItems lists all items of the editor's type", () => {
    const editor = createTrackControlEditor()
    editor.addItems([
      { tick: 10, value: 64 },
      { tick: 20, value: 100 },
    ])

    expect(editor.query(listControlItems)).toStrictEqual(editor.getItems())
  })

  it("getControlItemsByIds returns items for known ids and skips missing ones", () => {
    const editor = createTrackControlEditor()
    const [first, second] = editor.addItems([
      { tick: 10, value: 64 },
      { tick: 20, value: 100 },
    ])

    expect(
      editor.query(getControlItemsByIds([first.id, -1, second.id])),
    ).toStrictEqual([first, second])
  })

  it("getControlItemsClipboardData normalizes selected items to start at tick 0", () => {
    const editor = createTrackControlEditor({
      type: "controller",
      controllerType: 7,
    })
    const [first, second] = editor.addItems([
      { tick: 20, value: 64 },
      { tick: 40, value: 100 },
    ])

    expect(
      editor.query(getControlItemsClipboardData([first.id, second.id])),
    ).toStrictEqual({
      type: "control_events",
      valueEventType: { type: "controller", controllerType: 7 },
      events: [
        { id: first.id, tick: 0, value: 64 },
        { id: second.id, tick: 20, value: 100 },
      ],
    })
  })

  it("getControlItemsClipboardData returns null for an empty selection", () => {
    const editor = createTrackControlEditor()

    expect(editor.query(getControlItemsClipboardData([]))).toBeNull()
  })

  it("getControlItemsInRangeWithPrevious includes the last item before the range", () => {
    const editor = createTrackControlEditor()
    editor.addItems([
      { tick: 0, value: 1 },
      { tick: 10, value: 2 },
      { tick: 20, value: 3 },
    ])

    const items = editor.query(getControlItemsInRangeWithPrevious([15, 25]))

    expect(items.map((item) => item.tick)).toStrictEqual([10, 20])
  })

  it("getControlItemsInRangeWithPrevious omits the previous item when none precedes the range", () => {
    const editor = createTrackControlEditor()
    editor.addItems([{ tick: 20, value: 3 }])

    const items = editor.query(getControlItemsInRangeWithPrevious([0, 10]))

    expect(items).toStrictEqual([])
  })
})
