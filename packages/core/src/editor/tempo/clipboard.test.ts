import { describe, expect, it } from "vitest"
import { TempoItem } from "../../entities/tempo/TempoItem"
import { addClipboardTempoEvents } from "./mutations/composed"
import { TempoEditorMutatorContext } from "./mutations/type"
import { tempoEventsToClipboardData } from "./queries/tempo"

const createContext = (items: readonly TempoItem[]) => {
  const added: Omit<TempoItem, "id">[] = []
  const context = {
    getItems: () => items,
    getById: (id: number) => items.find((item) => item.id === id),
    addItems: (newItems: readonly Omit<TempoItem, "id">[]) => {
      added.push(...newItems)
      return newItems.map((item, index) => ({ ...item, id: index + 100 }))
    },
    removeItems: () => {},
    updateItems: () => {},
  } as unknown as TempoEditorMutatorContext

  return { context, added }
}

describe("tempo clipboard", () => {
  it("copies normalized TempoItems", () => {
    const { context } = createContext([
      { id: 1, tick: 20, bpm: 120 },
      { id: 2, tick: 40, bpm: 150 },
    ])

    expect(tempoEventsToClipboardData([1, 2])(context)).toStrictEqual({
      type: "tempo_events",
      items: [
        { id: 1, tick: 0, bpm: 120 },
        { id: 2, tick: 20, bpm: 150 },
      ],
    })
  })

  it("pastes TempoItems at the target tick without reusing IDs", () => {
    const { context, added } = createContext([])

    addClipboardTempoEvents(
      {
        type: "tempo_events",
        items: [
          { id: 1, tick: 0, bpm: 120 },
          { id: 2, tick: 20, bpm: 150 },
        ],
      },
      30,
    )(context)

    expect(added).toStrictEqual([
      { tick: 30, bpm: 120 },
      { tick: 50, bpm: 150 },
    ])
  })
})
