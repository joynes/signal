import { isEventInRange, isNotUndefined, Range } from "@signal-app/core"
import { maxBy, min } from "lodash"
import { ControlItem } from "../entities/ControlItem"
import { ClipboardData } from "../entities/clipboardTypes"
import { getItemById, getItems, getValueEventType } from "./primitives"
import { ControlEditorQuery } from "./type"

export const listItems: ControlEditorQuery<readonly ControlItem[]> = getItems

export const getItemsByIds =
  (ids: readonly number[]): ControlEditorQuery<readonly ControlItem[]> =>
  (context) =>
    ids.map((id) => getItemById(id)(context)).filter(isNotUndefined)

export const getItemsClipboardData =
  (ids: readonly number[]): ControlEditorQuery<ClipboardData | null> =>
  (context) => {
    const items = getItemsByIds(ids)(context)
    const minTick = min(items.map((item) => item.tick))

    if (minTick === undefined) {
      return null
    }

    return {
      type: "control_events",
      valueEventType: getValueEventType(context),
      events: items.map((item) => ({ ...item, tick: item.tick - minTick })),
    }
  }

export const getItemsInRangeWithPrevious =
  (tickRange: Range): ControlEditorQuery<readonly ControlItem[]> =>
  (context) => {
    const [tickStart] = tickRange
    const items = getItems(context)

    const itemsInRange = items.filter(isEventInRange(tickRange))
    const prevItem = maxBy(
      items.filter((item) => item.tick < tickStart),
      (item) => item.tick,
    )

    return prevItem ? [prevItem, ...itemsInRange] : itemsInRange
  }
