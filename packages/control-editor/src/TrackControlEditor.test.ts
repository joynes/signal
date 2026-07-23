import { Track } from "@signal-app/core"
import { describe, expect, it, vi } from "vitest"
import { pasteItemsAtPosition } from "./mutations/composed"
import { getItemsClipboardData, listItems } from "./queries/items"
import { TrackControlEditor } from "./TrackControlEditor"
import { createTrackControlEditor } from "./testUtils"

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
    expect(editor.query(listItems)).toEqual(editor.getItems())
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

  it("creates a preview MIDI event for the editor's own type without mutating anything", () => {
    const editor = createTrackControlEditor({
      type: "controller",
      controllerType: 7,
    })

    const event = editor.createPreviewEvent(100)

    expect(event).toMatchObject({
      subtype: "controller",
      controllerType: 7,
      value: 100,
    })
    expect(editor.getItems()).toStrictEqual([])
  })

  it("round-trips selected items through clipboard data and paste", () => {
    const editor = createTrackControlEditor()
    const [first] = editor.addItems([{ tick: 10, value: 1 }])
    const [second] = editor.addItems([{ tick: 20, value: 2 }])

    const data = editor.query(getItemsClipboardData([first.id, second.id]))
    if (data === null) {
      throw new Error("expected clipboard data")
    }
    expect(data.events.map((e) => e.tick)).toStrictEqual([0, 10])

    editor.mutate(pasteItemsAtPosition(data, 50))

    const items = editor
      .getItems()
      .map((item) => ({ tick: item.tick, value: item.value }))
      .sort((a, b) => a.tick - b.tick)

    expect(items).toStrictEqual([
      { tick: 10, value: 1 },
      { tick: 20, value: 2 },
      { tick: 50, value: 1 },
      { tick: 60, value: 2 },
    ])
  })
})
