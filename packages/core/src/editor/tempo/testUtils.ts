import { Song } from "../../entities/song/Song"
import { Track } from "../../entities/track"
import { bpmToUSecPerBeat } from "../../helpers/bpm"
import { setTempoMidiEvent } from "../../midi"
import { SongTempoEditor } from "./SongTempoEditor"

export const createSongTempoEditor = (
  items: readonly { tick: number; bpm: number }[] = [],
): SongTempoEditor => {
  const song = new Song()
  song.addTrack(new Track())

  song.conductorTrack?.addEvents(
    items.map((item) => ({
      ...setTempoMidiEvent(0, Math.floor(bpmToUSecPerBeat(item.bpm))),
      tick: item.tick,
    })),
  )

  return new SongTempoEditor(song)
}
