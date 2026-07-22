import { listItems } from "@signal-app/core"
import { useCallback } from "react"
import { useDerivedValue } from "../../../hooks/useDerivedValue"
import { useTempoEditorService } from "./useTempoEditor"

export function useTempoItems() {
  const tempoEditor = useTempoEditorService()
  return useDerivedValue(
    tempoEditor.observeTempoItems,
    useCallback(() => tempoEditor.query(listItems), [tempoEditor]),
  )
}
