import { setBpm } from "@signal-app/tempo-editor"
import { useCallback } from "react"
import { useHistory } from "../../../hooks/useHistory"
import { useTempoEditorService } from "./useTempoEditor"

export const useChangeTempo = () => {
  const tempoEditor = useTempoEditorService()
  const { pushHistory } = useHistory()
  return useCallback(
    (id: number, bpm: number) => {
      pushHistory()
      tempoEditor.mutate(setBpm(id, bpm))
    },
    [tempoEditor, pushHistory],
  )
}
