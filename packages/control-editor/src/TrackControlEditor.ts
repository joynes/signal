import {
  createOrUpdate as createOrUpdateTrackEvent,
  getAll,
  getEventById,
  Track,
  TrackEvent,
  updateEvents as updateTrackEvents,
} from "@signal-app/core"
import { Unsubscribe } from "@signal-app/observable"
import { ControlEvent } from "./entities/ControlEvent"
import { ControlItem } from "./entities/ControlItem"
import { controlEventToItem } from "./entities/transform"
import { ValueEventType } from "./entities/ValueEventType"
import { ControlEditorMutator } from "./mutations/type"
import { ControlEditorQuery } from "./queries/type"
import { ControlEditor } from "./type"

export class TrackControlEditor implements ControlEditor {
  private readonly predicate: (e: TrackEvent) => e is ControlEvent
  private readonly factory: ReturnType<typeof ValueEventType.getEventFactory>

  constructor(
    private readonly track: Track,
    readonly type: ValueEventType,
  ) {
    const predicate = ValueEventType.getEventPredicate(type)
    this.predicate = (e): e is ControlEvent => predicate(e)
    this.factory = ValueEventType.getEventFactory(type)
  }

  getItems = (): readonly ControlItem[] =>
    this.track.query(getAll).filter(this.predicate).map(controlEventToItem)

  getById = (id: number): ControlItem | undefined => {
    const event = this.track.query(getEventById(id))
    return event !== undefined && this.predicate(event)
      ? controlEventToItem(event)
      : undefined
  }

  addItems = (items: readonly Omit<ControlItem, "id">[]): ControlItem[] =>
    this.track
      .mutate((events) =>
        items.map((item) =>
          createOrUpdateTrackEvent<ControlEvent>({
            ...this.factory(item.value),
            tick: item.tick,
          })(events),
        ),
      )
      .map(controlEventToItem)

  removeItems = (ids: readonly number[]): void => {
    this.track.removeEvents(ids)
  }

  updateItems = (items: readonly ControlItem[]): void => {
    this.track.mutate(updateTrackEvents(items))
  }

  observeItems = (listener: () => void): Unsubscribe =>
    this.track.subscribeEventsChanged(this.predicate, listener)

  createPreviewEvent = (value: number) => this.factory(value)

  query = <R>(fn: ControlEditorQuery<R>): R => fn(this)

  mutate = <R = void>(fn: ControlEditorMutator<R>): R =>
    this.track.transaction(() => fn(this))
}
