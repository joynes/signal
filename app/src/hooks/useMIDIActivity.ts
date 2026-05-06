import { TrackId } from "@signal-app/core"
import { useEffect } from "react"
import { MIDIInputEvent } from "../services/MIDIInput"
import { useMIDIDevice } from "./useMIDIDevice"
import { usePianoRoll } from "./usePianoRoll"
import { useStores } from "./useStores"
import { useTrack } from "./useTrack"

export const useMIDIActivity = (trackId: TrackId, onActivity: () => void) => {
  const { midiInput } = useStores()
  const { channel } = useTrack(trackId)
  const { midiInputRouting } = useMIDIDevice()
  const { selectedTrackId } = usePianoRoll()

  useEffect(() => {
    return midiInput.on("midiMessage", (e) => {
      const activity = checkActivityEvent(e)
      if (!activity) {
        return
      }
      switch (midiInputRouting) {
        case "selectedTrack":
          if (trackId !== selectedTrackId) {
            return
          }
          break
        case "channelRouting":
          if (channel !== activity.channel) {
            return
          }
          break
      }
      onActivity()
    })
  }, [
    midiInput,
    channel,
    midiInputRouting,
    trackId,
    selectedTrackId,
    onActivity,
  ])
}

function checkActivityEvent(e: MIDIInputEvent): { channel: number } | null {
  if (e.data.length === 0) {
    return null
  }
  const statusByte = e.data[0]
  // Only handle channel messages (0x80–0xEF)
  if (statusByte < 0x80 || statusByte >= 0xf0) {
    return null
  }
  const msgType = (statusByte >> 4) & 0x0f
  // Ignore note-off (0x8n) and note-on with velocity 0 (0x9n, velocity=0)
  if (
    msgType === 0x8 ||
    (msgType === 0x9 && e.data.length >= 3 && e.data[2] === 0)
  ) {
    return null
  }

  const channel = statusByte & 0x0f
  return { channel }
}
