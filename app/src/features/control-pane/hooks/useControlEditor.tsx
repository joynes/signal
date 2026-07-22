import {
  ControlEditor,
  TrackControlEditor,
  ValueEventType,
} from "@signal-app/core"
import { createContext, FC, ReactNode, useContext, useMemo } from "react"
import { useSong } from "../../../hooks/useSong"
import { usePianoRoll } from "../../piano-roll/hooks/usePianoRoll"

const ControlEditorContext = createContext<ControlEditor | undefined>(undefined)

export const ControlEditorProvider: FC<{
  type: ValueEventType
  children: ReactNode
}> = ({ type, children }) => {
  const { getTrack } = useSong()
  const { selectedTrackId } = usePianoRoll()

  const controlEditor = useMemo(() => {
    const track = getTrack(selectedTrackId)
    if (track === undefined) {
      throw new Error(
        `ControlEditorProvider: track ${selectedTrackId} not found`,
      )
    }
    return new TrackControlEditor(track, type)
  }, [getTrack, selectedTrackId, type])

  return (
    <ControlEditorContext.Provider value={controlEditor}>
      {children}
    </ControlEditorContext.Provider>
  )
}

export function useControlEditor(): ControlEditor {
  const controlEditor = useContext(ControlEditorContext)
  if (controlEditor === undefined) {
    throw new Error(
      "useControlEditor must be used within a ControlEditorProvider",
    )
  }
  return controlEditor
}
