import {
  copyTempoEvents as copyTempoEventsCmd,
  duplicateEvents as duplicateEventsCmd,
  pasteTempoEventsAt as pasteTempoEventsAtCmd,
  TempoEventsClipboardDataSchema,
} from "@signal-app/core"
import { useCallback } from "react"
import { useMutateConductorTrack } from "../../../hooks/useCommand"
import { useConductorTrack } from "../../../hooks/useConductorTrack"
import { useHistory } from "../../../hooks/useHistory"
import { usePlayer } from "../../../hooks/usePlayer"
import {
  readClipboardData,
  readJSONFromClipboard,
  writeClipboardData,
} from "../../../services/Clipboard"
import { useTempoEditor } from "./useTempoEditor"

export const useDeleteTempoSelection = () => {
  const { removeEvents } = useConductorTrack()
  const { pushHistory } = useHistory()
  const { selectedEventIds, setSelection } = useTempoEditor()

  return () => {
    if (selectedEventIds.length === 0) {
      return
    }

    pushHistory()

    // 選択範囲と選択されたノートを削除
    // Remove selected notes and selected notes
    removeEvents(selectedEventIds)
    setSelection(null)
  }
}

export const useCopyTempoSelection = () => {
  const { selectedEventIds } = useTempoEditor()
  const copyTempoEvents = useConductorTrackCommand(copyTempoEventsCmd)

  return async () => {
    const data = copyTempoEvents(selectedEventIds)
    if (!data) {
      return
    }
    await writeClipboardData(data)
  }
}

export const usePasteTempoSelection = () => {
  const { position } = usePlayer()
  const { id: conductorTrackId } = useConductorTrack()
  const { pushHistory } = useHistory()
  const pasteTempoEvents = useTrackCommand(
    conductorTrackId,
    pasteTempoEventsAtCmd,
  )

  return async (e?: ClipboardEvent) => {
    const obj = e ? readJSONFromClipboard(e) : await readClipboardData()
    const { data } = TempoEventsClipboardDataSchema.safeParse(obj)

    if (!data) {
      return
    }

    pushHistory()
    pasteTempoEvents(data, position)
  }
}

export const useCutTempoSelection = () => {
  const copyTempoSelection = useCopyTempoSelection()
  const deleteTempoSelection = useDeleteTempoSelection()

  return useCallback(() => {
    copyTempoSelection()
    deleteTempoSelection()
  }, [copyTempoSelection, deleteTempoSelection])
}

export const useDuplicateTempoSelection = () => {
  const { pushHistory } = useHistory()
  const { selectedEventIds, setSelectedEventIds } = useTempoEditor()
  const mutateConductorTrack = useMutateConductorTrack()

  return () => {
    if (selectedEventIds.length === 0) {
      return
    }

    pushHistory()

    const addedEventIds = mutateConductorTrack(duplicateEventsCmd(selectedEventIds)) ?? []

    // select the created events
    setSelectedEventIds(addedEventIds)
  }
}
