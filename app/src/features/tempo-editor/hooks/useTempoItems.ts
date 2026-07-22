import { listItems } from "@signal-app/core"
import { useSyncExternalStore } from "react"
import { useTempoEditorService } from "./useTempoEditor"

export function useTempoItems() {
  const tempoEditor = useTempoEditorService()
  return useSyncExternalStore(tempoEditor.observeTempoItems, () =>
    tempoEditor.query(listItems),
  )
}
