import { describe, expect, it } from "vitest"
import { ClipboardData } from "../entities/clipboardTypes"
import { createTrackControlEditor } from "../testUtils"
import {
  createOrUpdateItemValue,
  duplicateItems,
  moveItems,
  pasteItemsAtPosition,
  removeItems,
  removeRedundantItems,
  updateItemsInRange,
  updateItemsInRangeWithEasing,
} from "./composed"

describe("control editor composed mutations", () => {
  it("removeItems removes selected items", () => {
    const editor = createTrackControlEditor()
    const [first, second] = editor.addItems([
      { tick: 10, value: 1 },
      { tick: 20, value: 2 },
    ])

    editor.mutate(removeItems([first.id]))

    expect(editor.getItems()).toMatchObject([{ id: second.id }])
  })

  it("moveItems shifts tick and value, clamping the value", () => {
    const editor = createTrackControlEditor()
    const [added] = editor.addItems([{ tick: 10, value: 64 }])

    editor.mutate(moveItems([added.id], 5, 100, 127))

    expect(editor.getById(added.id)).toMatchObject({ tick: 15, value: 127 })
  })

  it("removeRedundantItems keeps the source item and removes others at the same tick", () => {
    const editor = createTrackControlEditor()
    const [source] = editor.addItems([{ tick: 10, value: 64 }])
    const [other] = editor.addItems([{ tick: 30, value: 100 }])
    editor.updateItems([{ ...other, tick: 10 }])

    editor.mutate(removeRedundantItems([source.id]))

    expect(editor.getItems()).toStrictEqual([source])
  })

  it("duplicateItems shifts a copy by the selection's tick span", () => {
    const editor = createTrackControlEditor()
    const [first, second] = editor.addItems([
      { tick: 10, value: 1 },
      { tick: 30, value: 2 },
    ])

    const newIds = editor.mutate(duplicateItems([first.id, second.id]))

    const duplicatedTicks = newIds
      .map((id) => editor.getById(id)?.tick)
      .sort((a, b) => (a ?? 0) - (b ?? 0))
    expect(duplicatedTicks).toStrictEqual([30, 50])
  })

  it("createOrUpdateItemValue creates a new item when nothing is selected", () => {
    const editor = createTrackControlEditor()

    editor.mutate(createOrUpdateItemValue([], 64, 10))

    expect(editor.getItems()).toMatchObject([{ tick: 10, value: 64 }])
  })

  it("createOrUpdateItemValue updates every selected item's value", () => {
    const editor = createTrackControlEditor()
    const [first, second] = editor.addItems([
      { tick: 10, value: 1 },
      { tick: 20, value: 2 },
    ])

    editor.mutate(createOrUpdateItemValue([first.id, second.id], 100, 999))

    expect(editor.getItems()).toMatchObject([
      { tick: 10, value: 100 },
      { tick: 20, value: 100 },
    ])
  })

  it("updateItemsInRangeWithEasing replaces the range with an eased curve", () => {
    const editor = createTrackControlEditor()
    const quantizeUnit = 10
    const quantizeFloor = (tick: number) =>
      Math.floor(tick / quantizeUnit) * quantizeUnit

    editor.mutate(
      updateItemsInRangeWithEasing(
        [0, 100],
        [0, 20],
        quantizeFloor,
        quantizeUnit,
        (t) => t * t,
      ),
    )

    const items = editor
      .getItems()
      .map((item) => ({ tick: item.tick, value: item.value }))
      .sort((a, b) => a.tick - b.tick)

    expect(items).toStrictEqual([
      { tick: 0, value: 0 },
      { tick: 10, value: 25 },
      { tick: 20, value: 100 },
    ])
  })

  it("updateItemsInRange replaces the range with a linear ramp", () => {
    const editor = createTrackControlEditor()
    const quantizeUnit = 10
    const quantizeFloor = (tick: number) =>
      Math.floor(tick / quantizeUnit) * quantizeUnit

    editor.mutate(
      updateItemsInRange([0, 100], [0, 20], quantizeFloor, quantizeUnit),
    )

    const items = editor
      .getItems()
      .map((item) => ({ tick: item.tick, value: item.value }))
      .sort((a, b) => a.tick - b.tick)

    expect(items).toStrictEqual([
      { tick: 0, value: 0 },
      { tick: 10, value: 50 },
      { tick: 20, value: 100 },
    ])
  })

  it("pasteItemsAtPosition pastes matching-type clipboard items shifted by position", () => {
    const editor = createTrackControlEditor({
      type: "controller",
      controllerType: 11,
    })
    const data: ClipboardData = {
      type: "control_events",
      valueEventType: { type: "controller", controllerType: 11 },
      events: [
        { id: 1, tick: 0, value: 10 },
        { id: 2, tick: 5, value: 20 },
      ],
    }

    editor.mutate(pasteItemsAtPosition(data, 100))

    const items = editor
      .getItems()
      .map((item) => ({ tick: item.tick, value: item.value }))
      .sort((a, b) => a.tick - b.tick)

    expect(items).toStrictEqual([
      { tick: 100, value: 10 },
      { tick: 105, value: 20 },
    ])
  })

  it("pasteItemsAtPosition refuses clipboard data from a different ValueEventType", () => {
    const editor = createTrackControlEditor({ type: "pitchBend" })
    const data: ClipboardData = {
      type: "control_events",
      valueEventType: { type: "controller", controllerType: 11 },
      events: [{ id: 1, tick: 0, value: 10 }],
    }

    editor.mutate(pasteItemsAtPosition(data, 100))

    expect(editor.getItems()).toStrictEqual([])
  })
})
