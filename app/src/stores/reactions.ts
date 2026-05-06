import { observe, reaction } from "mobx"
import RootStore from "./RootStore"

export const registerReactions = (rootStore: RootStore) => {
  observe(
    rootStore.midiRecorder,
    "isRecording",
    disableSeekWhileRecording(rootStore),
  )

  observe(rootStore.player, "isPlaying", stopRecordingWhenStopPlayer(rootStore))

  // Watch for song changes and set the auto-save flag
  reaction(
    () => rootStore.songStore.song.isSaved,
    (isSaved) => {
      if (!isSaved) {
        rootStore.autoSaveService.onSongChanged()
      }
    },
  )
}

type Reaction = (rootStore: RootStore) => () => void

const disableSeekWhileRecording: Reaction =
  ({ player, midiRecorder }) =>
  () =>
    (player.disableSeek = midiRecorder.isRecording)

const stopRecordingWhenStopPlayer: Reaction =
  ({ player, midiRecorder }) =>
  () => {
    if (!player.isPlaying) {
      midiRecorder.isRecording = false
    }
  }
