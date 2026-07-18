import { getVolume, isVolumeEvent, volumeMidiEvent } from "@signal-app/core"
import { useCallback, useMemo, useState } from "react"
import { useHistory } from "../../../hooks/useHistory"
import { usePlayer } from "../../../hooks/usePlayer"
import { useTrack } from "../../../hooks/useTrack"
import { useTrackQuery } from "../../../hooks/useTrackQuery"
import { usePianoRoll } from "../hooks/usePianoRoll"

const DEFAULT_VOLUME = 100

export function useVolumeSlider() {
  const { selectedTrack, selectedTrackId: trackId } = usePianoRoll()
  const { position, sendEvent } = usePlayer()
  const { pushHistory } = useHistory()
  const { setVolume, channel } = useTrack(trackId)
  const [isDragging, setIsDragging] = useState(false)
  const query = useMemo(() => getVolume(position), [position])
  const currentVolumeEvent = useTrackQuery(selectedTrack, query, isVolumeEvent)

  const setTrackVolume = useCallback(
    (volume: number) => {
      if (!isDragging) {
        // record history for the keyboard event (no dragging)
        pushHistory()
      }

      setVolume(volume, position)

      if (channel !== undefined) {
        sendEvent(volumeMidiEvent(0, channel, volume))
      }
    },
    [pushHistory, setVolume, position, sendEvent, channel, isDragging],
  )

  return {
    value: currentVolumeEvent?.value ?? DEFAULT_VOLUME,
    setValue: setTrackVolume,
    onPointerDown: useCallback(() => {
      // record history only when dragging starts
      pushHistory()
      setIsDragging(true)
    }, [pushHistory]),
    onPointerUp: useCallback(() => {
      setIsDragging(false)
    }, []),
  }
}
