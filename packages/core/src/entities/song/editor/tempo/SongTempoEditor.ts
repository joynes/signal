import { Unsubscribe } from "@signal-app/observable"
import { bpmToUSecPerBeat } from "../../../../helpers/bpm"
import { isSetTempoEvent } from "../../../event"
import { getTempoItems } from "../../../track"
import { Song } from "../../Song"
import { TempoItem } from "./TempoItem"

export class SongTempoEditor {
  constructor(private readonly song: Song) {}

  observeTempoItems = (listener: () => void): Unsubscribe => {
    let unsubscribeTrack: Unsubscribe | undefined
    let unsubscribeConductorTrack: Unsubscribe | undefined

    const subscribeTrack = () => {
      unsubscribeTrack?.()
      const track = this.song.conductorTrack
      unsubscribeTrack = track?.subscribeEventsChanged(
        isSetTempoEvent,
        listener,
      )
    }

    const subscribeConductorTrack = () => {
      unsubscribeConductorTrack?.()
      unsubscribeConductorTrack = this.song.onConductorTrackChanged.subscribe(
        () => {
          subscribeTrack()
          listener()
        },
      )
    }

    const resubscribe = () => {
      subscribeConductorTrack()
      subscribeTrack()
      listener()
    }

    resubscribe()

    return () => {
      unsubscribeConductorTrack?.()
      unsubscribeTrack?.()
    }
  }

  listItems = (): readonly TempoItem[] => {
    const track = this.song.conductorTrack
    if (track === undefined) {
      return []
    }

    return track.query(getTempoItems)
  }

  setBpm = (id: number, bpm: number): void => {
    const track = this.song.conductorTrack
    if (track === undefined) {
      return
    }

    track.updateEvent(id, {
      microsecondsPerBeat: Math.floor(bpmToUSecPerBeat(bpm)),
    })
  }
}
