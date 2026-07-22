import { max, min } from "lodash"
import { ControlEventsClipboardData } from "../../../entities/clipboard/clipboardTypes"
import { ControlItem } from "../../../entities/control/ControlItem"
import {
  controlEventToItem,
  moveControlItem,
} from "../../../entities/control/transform"
import { Range } from "../../../entities/geometry/Range"
import { ControlEvent } from "../../../entities/track/queries/controller"
import { closedRange, interpolate } from "../../../helpers"
import { getControlItemsByIds, listControlItems } from "../queries/control"
import {
  addControlItem,
  removeControlItem,
  updateControlItem,
} from "./primitives"
import { ControlEditorMutator } from "./type"

export const removeControlItems =
  (ids: readonly number[]): ControlEditorMutator<void> =>
  (context) => {
    ids.forEach((id) => removeControlItem(id)(context))
  }

export const moveControlItems =
  (
    ids: readonly number[],
    deltaTick: number,
    deltaValue: number,
    maxValue: number,
  ): ControlEditorMutator<void> =>
  (context) => {
    const items = getControlItemsByIds(ids)(context)
    items
      .map(moveControlItem(deltaTick, deltaValue, maxValue))
      .forEach((item) => updateControlItem(item)(context))
  }

export const removeRedundantControlItems =
  (ids: readonly number[]): ControlEditorMutator<void> =>
  (context) => {
    const sourceIdByTick = new Map<number, number>()
    getControlItemsByIds(ids)(context).forEach((item) => {
      if (!sourceIdByTick.has(item.tick)) {
        sourceIdByTick.set(item.tick, item.id)
      }
    })

    const idsToRemove = listControlItems(context).flatMap((item) => {
      const sourceId = sourceIdByTick.get(item.tick)
      return sourceId === undefined || sourceId === item.id ? [] : [item.id]
    })
    idsToRemove.forEach((id) => removeControlItem(id)(context))
  }

export const duplicateControlItems =
  (ids: readonly number[]): ControlEditorMutator<readonly number[]> =>
  (context) => {
    const selected = getControlItemsByIds(ids)(context)

    const deltaTick =
      selected.length === 0
        ? 0
        : (max(selected.map((item) => item.tick)) ?? 0) -
          (min(selected.map((item) => item.tick)) ?? 0)

    return selected
      .map((item) =>
        addControlItem({
          tick: Math.max(0, Math.floor(item.tick + deltaTick)),
          value: item.value,
        })(context),
      )
      .filter((item): item is ControlItem => item !== undefined)
      .map((item) => item.id)
  }

export const createOrUpdateControlItemValue =
  (
    selectedItemIds: readonly number[],
    value: number,
    tick: number,
  ): ControlEditorMutator<void> =>
  (context) => {
    const items = getControlItemsByIds(selectedItemIds)(context)

    if (items.length > 0) {
      items.forEach((item) => updateControlItem({ ...item, value })(context))
    } else {
      addControlItem({ tick: Math.max(0, Math.floor(tick)), value })(context)
    }
  }

export const updateControlItemsInRangeWithEasing =
  (
    valueRange: Range,
    tickRange: Range,
    quantizeFloor: (tick: number) => number,
    quantizeUnit: number,
    easing: (t: number) => number,
  ): ControlEditorMutator<void> =>
  (context) => {
    const [startTick, endTick] = tickRange
    const quantizedStartTick = quantizeFloor(Math.max(0, startTick))
    const quantizedEndTick = quantizeFloor(Math.max(0, endTick))

    const getValue = interpolate(valueRange, tickRange, easing)

    const updateStartTick = Math.min(startTick, quantizedStartTick)
    const updateEndTick = Math.max(endTick, quantizedEndTick)

    const idsToRemove = listControlItems(context)
      .filter(
        (item) =>
          item.tick !== startTick &&
          item.tick >= updateStartTick &&
          item.tick <= updateEndTick,
      )
      .map((item) => item.id)
    idsToRemove.forEach((id) => removeControlItem(id)(context))

    closedRange(quantizedStartTick, quantizedEndTick, quantizeUnit).forEach(
      (tick) => {
        addControlItem({ tick, value: getValue(tick) })(context)
      },
    )
  }

export const updateControlItemsInRange = (
  valueRange: Range,
  tickRange: Range,
  quantizeFloor: (tick: number) => number,
  quantizeUnit: number,
): ControlEditorMutator<void> =>
  updateControlItemsInRangeWithEasing(
    valueRange,
    tickRange,
    quantizeFloor,
    quantizeUnit,
    (t) => t,
  )

export const pasteControlItemsAtPosition =
  (
    data: ControlEventsClipboardData,
    position: number,
  ): ControlEditorMutator<void> =>
  (context) => {
    const items = (data.events as ControlEvent[]).map(controlEventToItem)
    items.forEach((item) => {
      addControlItem({
        tick: Math.max(0, item.tick + position),
        value: item.value,
      })(context)
    })
  }
