import { getPan, isPanEvent, panMidiEvent } from "@signal-app/core"
import { useCallback, useMemo, useState } from "react"
import { useHistory } from "../../../hooks/useHistory"
import { usePlayer } from "../../../hooks/usePlayer"
import { useTrack } from "../../../hooks/useTrack"
import { useTrackQuery } from "../../../hooks/useTrackQuery"
import { usePianoRoll } from "./usePianoRoll"

const PAN_CENTER = 64

export function usePanSlider() {
  const { selectedTrack, selectedTrackId: trackId } = usePianoRoll()
  const { position, sendEvent } = usePlayer()
  const { pushHistory } = useHistory()
  const { setPan, channel } = useTrack(trackId)
  const [isDragging, setIsDragging] = useState(false)
  const query = useMemo(() => getPan(position), [position])
  const currentPanEvent = useTrackQuery(selectedTrack, query, isPanEvent)

  const setTrackPan = useCallback(
    (pan: number) => {
      if (!isDragging) {
        // record history for the keyboard event (no dragging)
        pushHistory()
      }

      setPan(pan, position)

      if (channel !== undefined) {
        sendEvent(panMidiEvent(0, channel, pan))
      }
    },
    [pushHistory, setPan, position, sendEvent, channel, isDragging],
  )

  return {
    value: currentPanEvent?.value ?? PAN_CENTER,
    setValue: setTrackPan,
    defaultValue: PAN_CENTER,
    onPointerDown: useCallback(() => {
      pushHistory()
      setIsDragging(true)
    }, [pushHistory]),
    onPointerUp: useCallback(() => {
      setIsDragging(false)
    }, []),
  }
}
