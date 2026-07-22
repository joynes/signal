import { maxBy, min } from "lodash"
import { ControlEventsClipboardData } from "../../../entities/clipboard/clipboardTypes"
import { ControlItem } from "../../../entities/control/ControlItem"
import { Range } from "../../../entities/geometry/Range"
import { isEventInRange, isNotUndefined } from "../../../helpers"
import { getControlItemById, getControlItems } from "./primitives"
import { ControlEditorQuery } from "./type"

export const listControlItems: ControlEditorQuery<readonly ControlItem[]> =
  getControlItems

export const getControlItemsByIds =
  (ids: readonly number[]): ControlEditorQuery<readonly ControlItem[]> =>
  (context) =>
    ids.map((id) => getControlItemById(id)(context)).filter(isNotUndefined)

export const getControlItemsClipboardData =
  (
    ids: readonly number[],
  ): ControlEditorQuery<ControlEventsClipboardData | null> =>
  (context) => {
    const items = getControlItemsByIds(ids)(context)
    const minTick = min(items.map((item) => item.tick))

    if (minTick === undefined) {
      return null
    }

    return {
      type: "control_events",
      events: items.map((item) => ({ ...item, tick: item.tick - minTick })),
    }
  }

export const getControlItemsInRangeWithPrevious =
  (tickRange: Range): ControlEditorQuery<readonly ControlItem[]> =>
  (context) => {
    const [tickStart] = tickRange
    const items = getControlItems(context)

    const itemsInRange = items.filter(isEventInRange(tickRange))
    const prevItem = maxBy(
      items.filter((item) => item.tick < tickStart),
      (item) => item.tick,
    )

    return prevItem ? [prevItem, ...itemsInRange] : itemsInRange
  }
