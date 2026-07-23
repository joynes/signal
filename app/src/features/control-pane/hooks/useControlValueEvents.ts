import { getItemsInRangeWithPrevious } from "@signal-app/control-editor"
import { useCallback } from "react"
import { useDerivedValue } from "../../../hooks/useDerivedValue"
import { useTickScroll } from "../../../hooks/useTickScroll"
import { useControlEditor } from "./useControlEditor"

export function useControlValueEvents() {
  const { tickRange } = useTickScroll()
  const controlEditor = useControlEditor()

  return useDerivedValue(
    useCallback(
      (listener: () => void) => controlEditor.observeItems(listener),
      [controlEditor],
    ),
    useCallback(
      () => controlEditor.query(getItemsInRangeWithPrevious(tickRange)),
      [controlEditor, tickRange],
    ),
  )
}
