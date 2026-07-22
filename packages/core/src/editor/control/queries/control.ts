import { maxBy } from "lodash"
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
