import { describe, expect, it } from "vitest"
import { createTrackControlEditor } from "../testUtils"
import {
  getItemsByIds,
  getItemsClipboardData,
  getItemsInRangeWithPrevious,
  listItems,
} from "./items"

describe("control editor composed queries", () => {
  it("listItems lists all items of the editor's type", () => {
    const editor = createTrackControlEditor()
    editor.addItems([
      { tick: 10, value: 64 },
      { tick: 20, value: 100 },
    ])

    expect(editor.query(listItems)).toStrictEqual(editor.getItems())
  })

  it("getItemsByIds returns items for known ids and skips missing ones", () => {
    const editor = createTrackControlEditor()
    const [first, second] = editor.addItems([
      { tick: 10, value: 64 },
      { tick: 20, value: 100 },
    ])

    expect(
      editor.query(getItemsByIds([first.id, -1, second.id])),
    ).toStrictEqual([first, second])
  })

  it("getItemsClipboardData normalizes selected items to start at tick 0", () => {
    const editor = createTrackControlEditor({
      type: "controller",
      controllerType: 7,
    })
    const [first, second] = editor.addItems([
      { tick: 20, value: 64 },
      { tick: 40, value: 100 },
    ])

    expect(
      editor.query(getItemsClipboardData([first.id, second.id])),
    ).toStrictEqual({
      type: "control_events",
      valueEventType: { type: "controller", controllerType: 7 },
      events: [
        { id: first.id, tick: 0, value: 64 },
        { id: second.id, tick: 20, value: 100 },
      ],
    })
  })

  it("getItemsClipboardData returns null for an empty selection", () => {
    const editor = createTrackControlEditor()

    expect(editor.query(getItemsClipboardData([]))).toBeNull()
  })

  it("getItemsInRangeWithPrevious includes the last item before the range", () => {
    const editor = createTrackControlEditor()
    editor.addItems([
      { tick: 0, value: 1 },
      { tick: 10, value: 2 },
      { tick: 20, value: 3 },
    ])

    const items = editor.query(getItemsInRangeWithPrevious([15, 25]))

    expect(items.map((item) => item.tick)).toStrictEqual([10, 20])
  })

  it("getItemsInRangeWithPrevious omits the previous item when none precedes the range", () => {
    const editor = createTrackControlEditor()
    editor.addItems([{ tick: 20, value: 3 }])

    const items = editor.query(getItemsInRangeWithPrevious([0, 10]))

    expect(items).toStrictEqual([])
  })
})
