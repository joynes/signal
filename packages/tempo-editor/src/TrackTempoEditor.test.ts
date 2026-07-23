import { describe, expect, it, vi } from "vitest"
import { listItems } from "./queries/items"
import { createTrackTempoEditor } from "./testUtils"

describe("TrackTempoEditor", () => {
  it("gets all tempo items and an item by ID", () => {
    const editor = createTrackTempoEditor([{ tick: 10, bpm: 120 }])
    const [item] = editor.getItems()

    expect(editor.getItems()).toContainEqual(item)
    expect(editor.getById(item.id)).toStrictEqual(item)
    expect(editor.getById(-1)).toBeUndefined()
  })

  it("adds, updates, and removes items", () => {
    const editor = createTrackTempoEditor()

    const [added] = editor.addItems([{ tick: 10, bpm: 120 }])
    editor.updateItems([{ ...added, tick: 20, bpm: 150 }])
    editor.removeItems([added.id])

    expect(editor.getItems()).toStrictEqual([])
  })

  it("applies queries and mutators", () => {
    const editor = createTrackTempoEditor()

    expect(editor.query(() => "query result")).toBe("query result")
    expect(editor.mutate(() => "mutation result")).toBe("mutation result")
    expect(editor.query(listItems)).toEqual(editor.getItems())
  })

  it("observes tempo item changes", () => {
    const editor = createTrackTempoEditor()
    const listener = vi.fn()
    const unsubscribe = editor.observeItems(listener)

    editor.addItems([{ tick: 10, bpm: 120 }])
    unsubscribe()
    editor.addItems([{ tick: 20, bpm: 150 }])

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
