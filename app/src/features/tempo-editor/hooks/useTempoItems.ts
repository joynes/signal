import { useMemo, useSyncExternalStore } from "react"
import { useTickScroll } from "../../../hooks/useTickScroll"
import { transformEvents } from "../helpers/transformEvents"
import { useTempoEditorService } from "./useTempoEditor"
import { useTempoTransform } from "./useTempoTransform"

export function useTempoItems() {
  const { transform } = useTempoTransform()
  const tempoEditor = useTempoEditorService()
  const tempoItems = useSyncExternalStore(
    tempoEditor.observeTempoItems,
    tempoEditor.listItems,
  )
  const { canvasWidth, scrollLeft } = useTickScroll()
  const items = useMemo(
    () => transformEvents(tempoItems, transform, canvasWidth + scrollLeft),
    [tempoItems, transform, canvasWidth, scrollLeft],
  )

  return {
    items,
  }
}
