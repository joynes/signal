import { describe, expect, it, vi } from "vitest"
import { ControlEventsClipboardData } from "../../entities/clipboard/clipboardTypes"
import { Track } from "../../entities/track/Track"
import {
  createOrUpdateControlItemValue,
  duplicateControlItems,
  moveControlItems,
  pasteControlItemsAtPosition,
  removeRedundantControlItems,
  updateControlItemsInRange,
  updateControlItemsInRangeWithEasing,
} from "./mutations/composed"
import {
  getControlItemsInRangeWithPrevious,
  listControlItems,
} from "./queries/control"
import { createTrackControlEditor } from "./testUtils"
import { TrackControlEditor } from "./TrackControlEditor"

describe("TrackControlEditor", () => {
  it("adds, gets, updates, and removes items", () => {
    const editor = createTrackControlEditor()

    const [added] = editor.addItems([{ tick: 10, value: 64 }])
    expect(editor.getById(added.id)).toStrictEqual(added)
    expect(editor.getItems()).toContainEqual(added)

    editor.updateItems([{ ...added, value: 100 }])
    expect(editor.getById(added.id)?.value).toBe(100)

    editor.removeItems([added.id])
    expect(editor.getItems()).toStrictEqual([])
  })

  it("only sees items matching its own type", () => {
    const track = new Track()
    const volumeEditor = new TrackControlEditor(track, {
      type: "controller",
      controllerType: 7,
    })
    const panEditor = new TrackControlEditor(track, {
      type: "controller",
      controllerType: 10,
    })
    const pitchBendEditor = new TrackControlEditor(track, { type: "pitchBend" })

    volumeEditor.addItems([{ tick: 0, value: 100 }])
    panEditor.addItems([{ tick: 0, value: 64 }])
    pitchBendEditor.addItems([{ tick: 0, value: 0 }])

    expect(volumeEditor.getItems()).toHaveLength(1)
    expect(panEditor.getItems()).toHaveLength(1)
    expect(pitchBendEditor.getItems()).toHaveLength(1)
  })

  it("applies queries and mutators", () => {
    const editor = createTrackControlEditor()

    expect(editor.query(() => "query result")).toBe("query result")
    expect(editor.mutate(() => "mutation result")).toBe("mutation result")
    expect(editor.query(listControlItems)).toEqual(editor.getItems())
  })

  it("observes item changes", () => {
    const editor = createTrackControlEditor()
    const listener = vi.fn()
    const unsubscribe = editor.observeItems(listener)

    editor.addItems([{ tick: 10, value: 64 }])
    unsubscribe()
    editor.addItems([{ tick: 20, value: 100 }])

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("creates a new item or updates the selected one", () => {
    const editor = createTrackControlEditor()

    editor.mutate(createOrUpdateControlItemValue([], 64, 10))
    const [created] = editor.getItems()
    expect(created.value).toBe(64)

    editor.mutate(createOrUpdateControlItemValue([created.id], 100, 10))
    expect(editor.getItems()).toHaveLength(1)
    expect(editor.getById(created.id)?.value).toBe(100)
  })

  it("moves items by delta tick and value", () => {
    const editor = createTrackControlEditor()
    const [added] = editor.addItems([{ tick: 10, value: 64 }])

    editor.mutate(moveControlItems([added.id], 5, 10, 127))

    const moved = editor.getById(added.id)
    expect(moved?.tick).toBe(15)
    expect(moved?.value).toBe(74)
  })

  it("returns items in range including the previous one", () => {
    const editor = createTrackControlEditor()
    editor.addItems([
      { tick: 0, value: 1 },
      { tick: 10, value: 2 },
      { tick: 20, value: 3 },
    ])

    const items = editor.query(getControlItemsInRangeWithPrevious([15, 25]))

    expect(items.map((item) => item.tick)).toStrictEqual([10, 20])
  })

  it("duplicates selected items shifted by their tick span", () => {
    const editor = createTrackControlEditor()
    const [first] = editor.addItems([{ tick: 10, value: 1 }])
    const [second] = editor.addItems([{ tick: 30, value: 2 }])

    const newIds = editor.mutate(duplicateControlItems([first.id, second.id]))

    expect(newIds).toHaveLength(2)
    const duplicatedTicks = newIds
      .map((id) => editor.getById(id)?.tick)
      .sort((a, b) => (a ?? 0) - (b ?? 0))
    expect(duplicatedTicks).toStrictEqual([30, 50])
  })

  it("removes redundant items sharing the source item's tick", () => {
    const editor = createTrackControlEditor()
    const [source] = editor.addItems([{ tick: 10, value: 64 }])
    const [other] = editor.addItems([{ tick: 30, value: 100 }])

    // move `other` onto the same tick as `source`, creating a collision
    editor.updateItems([{ ...other, tick: 10 }])

    editor.mutate(removeRedundantControlItems([source.id]))

    expect(editor.getItems().map((item) => item.id)).toStrictEqual([
      source.id,
    ])
  })

  it("replaces items in a tick range with quantized interpolated values", () => {
    const editor = createTrackControlEditor()
    const quantizeUnit = 10
    const quantizeFloor = (tick: number) =>
      Math.floor(tick / quantizeUnit) * quantizeUnit

    editor.mutate(
      updateControlItemsInRange([0, 100], [0, 20], quantizeFloor, quantizeUnit),
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

  it("replaces items in a tick range using an easing curve", () => {
    const editor = createTrackControlEditor()
    const quantizeUnit = 10
    const quantizeFloor = (tick: number) =>
      Math.floor(tick / quantizeUnit) * quantizeUnit

    editor.mutate(
      updateControlItemsInRangeWithEasing(
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

  it("pastes clipboard items shifted by position", () => {
    const editor = createTrackControlEditor()
    const data: ControlEventsClipboardData = {
      type: "control_events",
      events: [
        { id: 1, tick: 0, value: 10 },
        { id: 2, tick: 5, value: 20 },
      ],
    }

    editor.mutate(pasteControlItemsAtPosition(data, 100))

    const items = editor
      .getItems()
      .map((item) => ({ tick: item.tick, value: item.value }))
      .sort((a, b) => a.tick - b.tick)

    expect(items).toStrictEqual([
      { tick: 100, value: 10 },
      { tick: 105, value: 20 },
    ])
  })
})
