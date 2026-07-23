import {
  closedRange,
  interpolate,
  moveTempoItem,
  Range,
  TempoItem,
} from "@signal-app/core"
import { max, min } from "lodash"
import { ClipboardData } from "../entities/clipboardTypes"
import { getItemsByIds, listItems } from "../queries/items"
import { addItem, removeItem, updateItem } from "./primitives"
import { TempoEditorMutator } from "./type"

const createOrUpdateItems =
  (
    items: readonly Omit<TempoItem, "id">[],
  ): TempoEditorMutator<readonly TempoItem[]> =>
  (context) => {
    const existingByTick = new Map<number, TempoItem[]>()
    listItems(context).forEach((item) => {
      const existing = existingByTick.get(item.tick) ?? []
      existing.push(item)
      existingByTick.set(item.tick, existing)
    })

    const updates: TempoItem[] = []
    const additions: Omit<TempoItem, "id">[] = []
    const result: TempoItem[] = []

    items.forEach((item) => {
      const existing = existingByTick.get(item.tick)
      if (existing === undefined) {
        additions.push(item)
        return
      }

      const updated = existing.map((current) => ({ ...current, bpm: item.bpm }))
      updates.push(...updated)
      result.push(updated[0])
    })

    updates.forEach((item) => updateItem(item)(context))
    return [
      ...result,
      ...additions
        .map((item) => addItem(item)(context))
        .filter((item): item is TempoItem => item !== undefined),
    ]
  }

export const removeItems =
  (ids: readonly number[]): TempoEditorMutator<void> =>
  (context) => {
    ids.forEach((id) => removeItem(id)(context))
  }

export const duplicateItems =
  (ids: readonly number[]): TempoEditorMutator<readonly number[]> =>
  (context) => {
    const selected = getItemsByIds(ids)(context)

    const deltaTick =
      selected.length === 0
        ? 0
        : (max(selected.map((item) => item.tick)) ?? 0) -
          (min(selected.map((item) => item.tick)) ?? 0)

    return createOrUpdateItems(
      selected.map((item) => ({
        tick: Math.max(0, Math.floor(item.tick + deltaTick)),
        bpm: item.bpm,
      })),
    )(context).map((item) => item.id)
  }

export const pasteItemsAtPosition =
  (data: ClipboardData, tick: number): TempoEditorMutator<void> =>
  (context) => {
    createOrUpdateItems(
      data.items.map(({ id: _, ...item }) => ({
        ...item,
        tick: Math.max(0, Math.floor(item.tick + tick)),
      })),
    )(context)
  }

export const moveItems =
  (
    ids: readonly number[],
    deltaTick: number,
    deltaValue: number,
    maxBPM: number,
  ): TempoEditorMutator<void> =>
  (context) => {
    const updates = getItemsByIds(ids)(context).map(
      moveTempoItem(deltaTick, deltaValue, maxBPM),
    )
    updates.forEach((item) => updateItem(item)(context))
  }

export const removeRedundantItems =
  (ids: readonly number[]): TempoEditorMutator<void> =>
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

export const createOrUpdateItem =
  (tick: number, bpm: number): TempoEditorMutator<void> =>
  (context) => {
    createOrUpdateItems([{ tick: Math.max(0, Math.floor(tick)), bpm }])(context)
  }

export const updateItemsInRange =
  (
    valueRange: Range,
    tickRange: Range,
    quantizeFloor: (tick: number) => number,
    quantizeUnit: number,
  ): TempoEditorMutator<void> =>
  (context) => {
    const [startTick, endTick] = tickRange
    const quantizedStartTick = quantizeFloor(Math.max(0, startTick))
    const quantizedEndTick = quantizeFloor(Math.max(0, endTick))
    const eventUpdateStartTick = Math.min(startTick, quantizedStartTick)
    const eventUpdateEndTick = Math.max(endTick, quantizedEndTick)

    const idsToRemove = listItems(context).flatMap((item) =>
      item.tick === startTick ||
      item.tick < eventUpdateStartTick ||
      item.tick > eventUpdateEndTick
        ? []
        : [item.id],
    )
    idsToRemove.forEach((id) => removeItem(id)(context))
    const ticks = closedRange(
      quantizedStartTick,
      quantizedEndTick,
      quantizeUnit,
    )
    createOrUpdateItems(
      ticks.map((tick) => ({
        tick,
        bpm: interpolate(valueRange, tickRange)(tick),
      })),
    )(context)
  }

export const setBpm =
  (id: number, bpm: number): TempoEditorMutator<void> =>
  (context) => {
    const item = getItemsByIds([id])(context)[0]
    if (item !== undefined) {
      updateItem({ ...item, bpm })(context)
    }
  }
