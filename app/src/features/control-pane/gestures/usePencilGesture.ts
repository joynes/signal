import {
  addControlItem,
  Range,
  updateControlItemsInRange,
} from "@signal-app/core"
import { useCallback } from "react"
import { Point } from "../../../entities/geometry/Point"
import { MouseDownHandler } from "../../../gesture/MouseGesture"
import { getClientPos } from "../../../helpers/mouseEvent"
import { observeDrag } from "../../../helpers/observeDrag"
import { useHistory } from "../../../hooks/useHistory"
import { usePlayer } from "../../../hooks/usePlayer"
import { useQuantizer } from "../../../hooks/useQuantizer"
import { usePianoRoll } from "../../piano-roll/hooks/usePianoRoll"
import { ControlCoordTransform } from "../entities/ControlCoordTransform"
import { useControlEditor } from "../hooks/useControlEditor"
import { useControlPane } from "../hooks/useControlPane"

const useUpdateValueEvents = () => {
  const controlEditor = useControlEditor()
  const { quantizeFloor, quantizeUnit } = useQuantizer()

  return useCallback(
    (valueRange: Range, tickRange: Range) => {
      controlEditor.mutate(
        updateControlItemsInRange(
          valueRange,
          tickRange,
          quantizeFloor,
          quantizeUnit,
        ),
      )
    },
    [controlEditor, quantizeFloor, quantizeUnit],
  )
}

export const usePencilGesture = (): MouseDownHandler<
  [Point, ControlCoordTransform]
> => {
  const { setSelection: setPianoRollSelection, setSelectedNoteIds } =
    usePianoRoll()
  const { setSelectedEventIds, setSelection } = useControlPane()
  const controlEditor = useControlEditor()
  const { sendEvent } = usePlayer()
  const { pushHistory } = useHistory()
  const updateValueEvents = useUpdateValueEvents()

  return useCallback(
    (e, startPoint, transform) => {
      pushHistory()

      setSelectedEventIds([])
      setSelection(null)
      setPianoRollSelection(null)
      setSelectedNoteIds([])

      const startClientPos = getClientPos(e)
      const pos = transform.fromPosition(startPoint)

      controlEditor.mutate(addControlItem({ tick: pos.tick, value: pos.value }))
      sendEvent(controlEditor.createPreviewEvent(pos.value))

      let lastTick = pos.tick
      let lastValue = pos.value

      observeDrag({
        onMouseMove: (e) => {
          const posPx = getClientPos(e)
          const deltaPx = Point.sub(posPx, startClientPos)
          const local = Point.add(startPoint, deltaPx)
          const value = Math.max(
            0,
            Math.min(transform.maxValue, transform.fromPosition(local).value),
          )
          const tick = transform.getTick(local.x)

          updateValueEvents(
            Range.fromUnordered(lastValue, value),
            Range.fromUnordered(lastTick, tick),
          )

          lastTick = tick
          lastValue = value
        },
      })
    },
    [
      controlEditor,
      sendEvent,
      pushHistory,
      setPianoRollSelection,
      setSelectedEventIds,
      setSelection,
      setSelectedNoteIds,
      updateValueEvents,
    ],
  )
}
