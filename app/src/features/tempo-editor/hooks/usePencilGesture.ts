import { Range } from "@signal-app/core"
import { Point } from "@signal-app/geometry"
import {
  createOrUpdateItem,
  updateItemsInRange,
} from "@signal-app/tempo-editor"
import { useCallback } from "react"
import { MouseDownHandler } from "../../../gesture/MouseGesture"
import { getClientPos } from "../../../helpers/mouseEvent"
import { observeDrag } from "../../../helpers/observeDrag"
import { useHistory } from "../../../hooks/useHistory"
import { useQuantizer } from "../../../hooks/useQuantizer"
import { TempoCoordTransform } from "../entities/TempoCoordTransform"
import { useTempoEditorService } from "./useTempoEditor"

const useUpdateTempoEventsInRange = () => {
  const { quantizeFloor, quantizeUnit } = useQuantizer()

  return useCallback(
    (valueRange: Range, tickRange: Range) =>
      updateItemsInRange(valueRange, tickRange, quantizeFloor, quantizeUnit),
    [quantizeFloor, quantizeUnit],
  )
}

export const usePencilGesture = (): MouseDownHandler<
  [Point, TempoCoordTransform]
> => {
  const { pushHistory } = useHistory()
  const { quantizeRound } = useQuantizer()
  const tempoEditor = useTempoEditorService()
  const updateTempoEventsInRange = useUpdateTempoEventsInRange()

  return useCallback(
    (e, startPoint, transform) => {
      pushHistory()

      const startClientPos = getClientPos(e)
      const pos = transform.fromPosition(startPoint)
      tempoEditor.mutate(createOrUpdateItem(quantizeRound(pos.tick), pos.bpm))

      let lastTick = pos.tick
      let lastValue = pos.bpm

      observeDrag({
        onMouseMove: (e) => {
          const posPx = getClientPos(e)
          const deltaPx = Point.sub(posPx, startClientPos)
          const local = Point.add(startPoint, deltaPx)
          const value = Math.max(
            0,
            Math.min(transform.maxBPM, transform.fromPosition(local).bpm),
          )
          const tick = transform.getTick(local.x)
          tempoEditor.mutate(
            updateTempoEventsInRange(
              Range.fromUnordered(lastValue, value),
              Range.fromUnordered(lastTick, tick),
            ),
          )

          lastTick = tick
          lastValue = value
        },
      })
    },
    [pushHistory, quantizeRound, tempoEditor, updateTempoEventsInRange],
  )
}
