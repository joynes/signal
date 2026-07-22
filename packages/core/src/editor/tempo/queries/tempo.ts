import { TempoEventsClipboardData } from "../../../entities/clipboard/clipboardTypes"
import { Range } from "../../../entities/geometry/Range"
import { TempoItem } from "../../../entities/tempo/TempoItem"
import { getById, getItems } from "./primitives"
import { TempoEditorQuery } from "./type"

export const listItems: TempoEditorQuery<readonly TempoItem[]> = getItems

export const getItemsByIds =
  (ids: readonly number[]): TempoEditorQuery<readonly TempoItem[]> =>
  (context) =>
    ids
      .map((id) => getById(id)(context))
      .filter((item): item is TempoItem => item !== undefined)

export const getEventIdsInRange =
  (range: Range): TempoEditorQuery<readonly number[]> =>
  (context) => {
    return getItems(context)
      .filter((item) => Range.contains(range, item.tick))
      .map((item) => item.id)
  }

export const tempoEventsToClipboardData =
  (ids: readonly number[]): TempoEditorQuery<TempoEventsClipboardData | null> =>
  (context) => {
    const selected = ids
      .map((id) => getById(id)(context))
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
