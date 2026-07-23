import { Range, TempoItem } from "@signal-app/core"
import { ClipboardData } from "../entities/clipboardTypes"
import { getItemById, getItems } from "./primitives"
import { TempoEditorQuery } from "./type"

export const listItems: TempoEditorQuery<readonly TempoItem[]> = getItems

export const getItemsByIds =
  (ids: readonly number[]): TempoEditorQuery<readonly TempoItem[]> =>
  (context) =>
    ids
      .map((id) => getItemById(id)(context))
      .filter((item): item is TempoItem => item !== undefined)

export const getEventIdsInRange =
  (range: Range): TempoEditorQuery<readonly number[]> =>
  (context) => {
    return getItems(context)
      .filter((item) => Range.contains(range, item.tick))
      .map((item) => item.id)
  }

export const getItemsClipboardData =
  (ids: readonly number[]): TempoEditorQuery<ClipboardData | null> =>
  (context) => {
    const selected = ids
      .map((id) => getItemById(id)(context))
      .filter((item): item is TempoItem => item !== undefined)

    if (selected.length === 0) {
      return null
    }

    const minTick = Math.min(...selected.map((item) => item.tick))

    return {
      type: "tempo_events",
      items: selected.map((item) => ({
        ...item,
        tick: item.tick - minTick,
      })),
    }
  }
