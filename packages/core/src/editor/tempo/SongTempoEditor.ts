import { Unsubscribe } from "@signal-app/observable"
import { SetTempoEvent } from "midifile-ts"
import { isSetTempoEvent, TrackEventOf } from "../../entities/event"
import { Song } from "../../entities/song/Song"
import { TempoItem } from "../../entities/tempo/TempoItem"
import {
  setTempoEventToTempoItem,
  tempoItemToSetTempoEvent,
} from "../../entities/tempo/transform"
import {
  getTempoItemById,
  getTempoItems,
  updateEvents,
} from "../../entities/track"
import { TempoEditorMutator } from "./mutations/type"
import { TempoEditorQuery } from "./queries/type"
import { TempoEditor } from "./type"

export class SongTempoEditor implements TempoEditor {
  constructor(private readonly song: Song) {}

  getItems = (): readonly TempoItem[] =>
    this.song.conductorTrack?.query(getTempoItems) ?? []

  getById = (id: number): TempoItem | undefined =>
    this.song.conductorTrack?.query(getTempoItemById(id))

  addItems = (items: readonly Omit<TempoItem, "id">[]): TempoItem[] => {
    const track = this.song.conductorTrack
    if (track === undefined) {
      return []
    }

    return track
      .addEvents<TrackEventOf<SetTempoEvent>>(
        items.map((item) =>
          tempoItemToSetTempoEvent({
            id: 0,
            ...item,
          }),
        ),
      )
      .map(setTempoEventToTempoItem)
  }

  removeItems = (ids: readonly number[]): void => {
    this.song.conductorTrack?.removeEvents(ids)
  }

  updateItems = (items: readonly TempoItem[]): void =>
    this.song.conductorTrack?.mutate(
      updateEvents(items.map(tempoItemToSetTempoEvent)),
    )

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

  query = <R>(fn: TempoEditorQuery<R>): R => fn(this)

  mutate = <R = void>(fn: TempoEditorMutator<R>): R => {
    const track = this.song.conductorTrack
    if (track === undefined) {
      return fn(this)
    }

    return track.transaction(() => fn(this))
  }
}
