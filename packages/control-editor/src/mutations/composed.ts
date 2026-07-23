import { closedRange, interpolate, Range } from "@signal-app/core"
import { max, min } from "lodash"
import { ControlItem } from "../entities/ControlItem"
import { ClipboardData } from "../entities/clipboardTypes"
import { moveControlItem } from "../entities/transform"
import { ValueEventType } from "../entities/ValueEventType"
import { getItemsByIds, listItems } from "../queries/items"
import { getValueEventType } from "../queries/primitives"
import { addItem, removeItem, updateItem } from "./primitives"
import { ControlEditorMutator } from "./type"

export const removeItems =
  (ids: readonly number[]): ControlEditorMutator<void> =>
  (context) => {
    ids.forEach((id) => removeItem(id)(context))
  }

export const moveItems =
  (
    ids: readonly number[],
    deltaTick: number,
    deltaValue: number,
    maxValue: number,
  ): ControlEditorMutator<void> =>
  (context) => {
    const items = getItemsByIds(ids)(context)
    items
      .map(moveControlItem(deltaTick, deltaValue, maxValue))
      .forEach((item) => updateItem(item)(context))
  }

export const removeRedundantItems =
  (ids: readonly number[]): ControlEditorMutator<void> =>
  (context) => {
    const sourceIdByTick = new Map<number, number>()
    getItemsByIds(ids)(context).forEach((item) => {
      if (!sourceIdByTick.has(item.tick)) {
        sourceIdByTick.set(item.tick, item.id)
      }
    })

    const idsToRemove = listItems(context).flatMap((item) => {
      const sourceId = sourceIdByTick.get(item.tick)
      return sourceId === undefined || sourceId === item.id ? [] : [item.id]
    })
    idsToRemove.forEach((id) => removeItem(id)(context))
  }

export const duplicateItems =
  (ids: readonly number[]): ControlEditorMutator<readonly number[]> =>
  (context) => {
    const selected = getItemsByIds(ids)(context)

    const deltaTick =
      selected.length === 0
        ? 0
        : (max(selected.map((item) => item.tick)) ?? 0) -
          (min(selected.map((item) => item.tick)) ?? 0)

    return selected
      .map((item) =>
        addItem({
          tick: Math.max(0, Math.floor(item.tick + deltaTick)),
          value: item.value,
        })(context),
      )
      .filter((item): item is ControlItem => item !== undefined)
      .map((item) => item.id)
  }

export const createOrUpdateItemValue =
  (
    selectedItemIds: readonly number[],
    value: number,
    tick: number,
  ): ControlEditorMutator<void> =>
  (context) => {
    const items = getItemsByIds(selectedItemIds)(context)

    if (items.length > 0) {
      items.forEach((item) => updateItem({ ...item, value })(context))
    } else {
      addItem({ tick: Math.max(0, Math.floor(tick)), value })(context)
    }
  }

export const updateItemsInRangeWithEasing =
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

    const idsToRemove = listItems(context)
      .filter(
        (item) =>
          item.tick !== startTick &&
          item.tick >= updateStartTick &&
          item.tick <= updateEndTick,
      )
      .map((item) => item.id)
    idsToRemove.forEach((id) => removeItem(id)(context))

    closedRange(quantizedStartTick, quantizedEndTick, quantizeUnit).forEach(
      (tick) => {
        addItem({ tick, value: getValue(tick) })(context)
      },
    )
  }

export const updateItemsInRange = (
  valueRange: Range,
  tickRange: Range,
  quantizeFloor: (tick: number) => number,
  quantizeUnit: number,
): ControlEditorMutator<void> =>
  updateItemsInRangeWithEasing(
    valueRange,
    tickRange,
    quantizeFloor,
    quantizeUnit,
    (t) => t,
  )

export const pasteItemsAtPosition =
  (data: ClipboardData, position: number): ControlEditorMutator<void> =>
  (context) => {
    // pitchBend and controller values live in different ranges (and
    // different controllers mean different things), so refuse to paste
    // data copied from a different ValueEventType.
    if (
      !ValueEventType.equals(data.valueEventType, getValueEventType(context))
    ) {
      return
    }

    data.events.forEach((item) => {
      addItem({
        tick: Math.max(0, item.tick + position),
        value: item.value,
      })(context)
    })
  }
