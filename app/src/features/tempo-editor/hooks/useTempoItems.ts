import { getSetTempoEventsWithNextTick, isSetTempoEvent } from "@signal-app/core"
import { useCallback, useMemo } from "react"
import { useDerivedValue } from "../../../hooks/useDerivedValue"
import { useSong } from "../../../hooks/useSong"
import { useTickScroll } from "../../../hooks/useTickScroll"
import { transformEvents } from "../helpers/transformEvents"
import { useTempoTransform } from "./useTempoTransform"

const noopSubscribe = () => () => {}

export function useTempoItems() {
  const { transform } = useTempoTransform()
  const { conductorTrack } = useSong()
  const tempoEvents = useDerivedValue(
    useCallback(
      (listener: () => void) =>
        conductorTrack?.subscribeEventsChanged(isSetTempoEvent, listener) ??
        noopSubscribe,
      [conductorTrack],
    ),
    useCallback(
      () => conductorTrack?.query(getSetTempoEventsWithNextTick) ?? [],
      [conductorTrack],
    ),
  )
  const { canvasWidth, scrollLeft } = useTickScroll()
  const items = useMemo(
    () => transformEvents(tempoEvents, transform, canvasWidth + scrollLeft),
    [tempoEvents, transform, canvasWidth, scrollLeft],
  )

  return {
    items,
  }
}
