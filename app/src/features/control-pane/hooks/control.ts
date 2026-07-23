import {
  ClipboardDataSchema,
  ControlEditor,
  createControlEditor,
  createOrUpdateItemValue,
  duplicateItems,
  getItemsClipboardData,
  getValueEventType,
  pasteItemsAtPosition,
  removeItems,
  ValueEventType,
} from "@signal-app/control-editor"
import { useCallback, useMemo } from "react"
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
        createOrUpdateItemValue(selectedEventIds, value, position),
      )
    },
    [selectedEventIds, controlEditor, position, pushHistory],
  )
}

// The hooks below are driven by always-mounted keyboard shortcuts and the
// selection context menu, so they may run while control mode is "velocity"
// (which has no ValueEventType) or before a track is selected. Unlike
// useControlEditor(), which throws when there's nothing to give out, this
// stays undefined-tolerant since "nothing to act on" is a normal state here.
const useControlEditorOrUndefined = (): ControlEditor | undefined => {
  const { selectedTrackId } = usePianoRoll()
  const { getTrack } = useSong()
  const { controlMode } = useControlPane()

  return useMemo(() => {
    if (controlMode.type === "velocity") {
      return undefined
    }
    const track = getTrack(selectedTrackId)
    return track !== undefined
      ? createControlEditor(track, controlMode)
      : undefined
  }, [controlMode, getTrack, selectedTrackId])
}

export const useDeleteControlSelection = () => {
  const { pushHistory } = useHistory()
  const { selectedEventIds, setSelection } = useControlPane()
  const controlEditor = useControlEditorOrUndefined()

  return useCallback(() => {
    if (selectedEventIds.length === 0 || controlEditor === undefined) {
      return
    }

    pushHistory()

    controlEditor.mutate(removeItems(selectedEventIds))
    setSelection(null)
  }, [selectedEventIds, controlEditor, pushHistory, setSelection])
}

export const useCopyControlSelection = () => {
  const { selectedEventIds } = useControlPane()
  const controlEditor = useControlEditorOrUndefined()

  return useCallback(async () => {
    if (selectedEventIds.length === 0 || controlEditor === undefined) {
      return
    }
    const data = controlEditor.query(getItemsClipboardData(selectedEventIds))
    if (!data) {
      return
    }

    await writeClipboardData(data)
  }, [selectedEventIds, controlEditor])
}

export const usePasteControlSelection = () => {
  const { position } = usePlayer()
  const { pushHistory } = useHistory()
  const controlEditor = useControlEditorOrUndefined()

  return useCallback(
    async (e?: ClipboardEvent) => {
      if (controlEditor === undefined) {
        return
      }

      const obj = e ? readJSONFromClipboard(e) : await readClipboardData()
      const { data } = ClipboardDataSchema.safeParse(obj)

      if (
        !data ||
        !ValueEventType.equals(
          data.valueEventType,
          controlEditor.query(getValueEventType),
        )
      ) {
        return
      }

      pushHistory()
      controlEditor.mutate(pasteItemsAtPosition(data, position))
    },
    [controlEditor, position, pushHistory],
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
  const { pushHistory } = useHistory()
  const { selectedEventIds, setSelectedEventIds } = useControlPane()
  const controlEditor = useControlEditorOrUndefined()

  return useCallback(() => {
    if (selectedEventIds.length === 0 || controlEditor === undefined) {
      return
    }

    pushHistory()

    // select the created events
    const addedEventIds = controlEditor.mutate(duplicateItems(selectedEventIds))
    setSelectedEventIds([...addedEventIds])
  }, [selectedEventIds, controlEditor, pushHistory, setSelectedEventIds])
}
