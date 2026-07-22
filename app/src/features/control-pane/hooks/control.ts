import {
  ControlEventsClipboardDataSchema,
  createOrUpdateControlItemValue,
  duplicateControlItems,
  getControlClipboardDataForSelection,
  pasteClipboardDataAtPosition,
  removeEvents,
  TrackControlEditor,
} from "@signal-app/core"
import { useCallback } from "react"
import { useMutateTrack } from "../../../hooks/useCommand"
import { useHistory } from "../../../hooks/useHistory"
import { usePlayer } from "../../../hooks/usePlayer"
import { useSong } from "../../../hooks/useSong"
import {
  readClipboardData,
  readJSONFromClipboard,
  writeClipboardData,
} from "../../../services/Clipboard"
import { usePianoRoll } from "../../piano-roll/hooks/usePianoRoll"
import { useControlEditor } from "./useControlEditor"
import { useControlPane } from "./useControlPane"

export const useCreateOrUpdateControlEventsValue = () => {
  const controlEditor = useControlEditor()
  const { position } = usePlayer()
  const { pushHistory } = useHistory()
  const { selectedEventIds } = useControlPane()

  return useCallback(
    (value: number) => {
      pushHistory()

      controlEditor.mutate(
        createOrUpdateControlItemValue(selectedEventIds, value, position),
      )
    },
    [selectedEventIds, controlEditor, position, pushHistory],
  )
}

export const useDeleteControlSelection = () => {
  const { selectedTrackId } = usePianoRoll()
  const mutate = useMutateTrack(selectedTrackId)
  const { pushHistory } = useHistory()
  const { selectedEventIds, setSelection } = useControlPane()

  return useCallback(() => {
    if (selectedEventIds.length === 0) {
      return
    }

    pushHistory()

    // Remove selected notes and selected notes
    mutate(removeEvents(selectedEventIds))
    setSelection(null)
  }, [selectedEventIds, mutate, pushHistory, setSelection])
}

export const useCopyControlSelection = () => {
  const { selectedTrackId } = usePianoRoll()
  const { selectedEventIds } = useControlPane()
  const mutate = useMutateTrack(selectedTrackId)

  return useCallback(async () => {
    if (selectedEventIds.length === 0) {
      return
    }
    const data = mutate(getControlClipboardDataForSelection(selectedEventIds))
    if (!data) {
      return
    }

    await writeClipboardData(data)
  }, [selectedEventIds, mutate])
}

export const usePasteControlSelection = () => {
  const { selectedTrackId } = usePianoRoll()
  const { position } = usePlayer()
  const { pushHistory } = useHistory()
  const mutate = useMutateTrack(selectedTrackId)

  return useCallback(
    async (e?: ClipboardEvent) => {
      const obj = e ? readJSONFromClipboard(e) : await readClipboardData()
      const { data } = ControlEventsClipboardDataSchema.safeParse(obj)

      if (!data) {
        return
      }

      pushHistory()
      mutate(pasteClipboardDataAtPosition(data, position))
    },
    [mutate, position, pushHistory],
  )
}

export const useCutControlSelection = () => {
  const copyControlSelection = useCopyControlSelection()
  const deleteControlSelection = useDeleteControlSelection()

  return useCallback(() => {
    copyControlSelection()
    deleteControlSelection()
  }, [copyControlSelection, deleteControlSelection])
}

export const useDuplicateControlSelection = () => {
  const { selectedTrackId } = usePianoRoll()
  const { getTrack } = useSong()
  const { pushHistory } = useHistory()
  const { controlMode, selectedEventIds, setSelectedEventIds } =
    useControlPane()

  return useCallback(() => {
    // Only pitchBend/controller selections reach here: velocity-mode
    // selection lives in usePianoRoll().selectedNoteIds, never here.
    if (selectedEventIds.length === 0 || controlMode.type === "velocity") {
      return
    }

    const track = getTrack(selectedTrackId)
    if (track === undefined) {
      return
    }

    pushHistory()

    // select the created events
    const controlEditor = new TrackControlEditor(track, controlMode)
    const addedEventIds = controlEditor.mutate(
      duplicateControlItems(selectedEventIds),
    )
    setSelectedEventIds([...addedEventIds])
  }, [
    selectedEventIds,
    controlMode,
    getTrack,
    selectedTrackId,
    pushHistory,
    setSelectedEventIds,
  ])
}
