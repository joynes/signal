import {
  getTempoItemById,
  getTempoItems,
  isSetTempoEvent,
  setTempoEventToTempoItem,
  TempoItem,
  Track,
  TrackEventOf,
  tempoItemToSetTempoEvent,
  updateEvents,
} from "@signal-app/core"
import { Unsubscribe } from "@signal-app/observable"
import { SetTempoEvent } from "midifile-ts"
import { TempoEditorMutator } from "./mutations/type"
import { TempoEditorQuery } from "./queries/type"
import { TempoEditor } from "./type"

export class TrackTempoEditor implements TempoEditor {
  constructor(private readonly conductorTrack: Track) {}

  getItems = (): readonly TempoItem[] =>
    this.conductorTrack.query(getTempoItems)

  getById = (id: number): TempoItem | undefined =>
    this.conductorTrack.query(getTempoItemById(id))

  addItems = (items: readonly Omit<TempoItem, "id">[]): TempoItem[] =>
    this.conductorTrack
      .addEvents<TrackEventOf<SetTempoEvent>>(
        items.map((item) =>
          tempoItemToSetTempoEvent({
            id: 0,
            ...item,
          }),
        ),
      )
      .map(setTempoEventToTempoItem)

  removeItems = (ids: readonly number[]): void => {
    this.conductorTrack.removeEvents(ids)
  }

  updateItems = (items: readonly TempoItem[]): void =>
    this.conductorTrack.mutate(
      updateEvents(items.map(tempoItemToSetTempoEvent)),
    )

  observeItems = (listener: () => void): Unsubscribe =>
    this.conductorTrack.subscribeEventsChanged(isSetTempoEvent, listener)

  query = <R>(fn: TempoEditorQuery<R>): R => fn(this)

  mutate = <R = void>(fn: TempoEditorMutator<R>): R =>
    this.conductorTrack.transaction(() => fn(this))
}
