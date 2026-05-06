import { reaction } from "mobx"
import RootStore from "./RootStore"

export const registerReactions = ({
  songStore,
  player,
  midiRecorder,
  autoSaveService,
}: RootStore) => {
  // disable seeking while recording
  midiRecorder.onIsRecordingChanged.subscribe(() => {
    player.disableSeek = midiRecorder.isRecording
  })

  // stop recording when stop player
  player.onIsPlayingChanged.subscribe(() => {
    if (!player.isPlaying) {
      midiRecorder.stop()
    }
  })

  // Watch for song changes and set the auto-save flag
  reaction(
    () => songStore.song.isSaved,
    (isSaved) => {
      if (!isSaved) {
        autoSaveService.onSongChanged()
      }
    },
  )
}
