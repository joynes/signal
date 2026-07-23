import { Unsubscribe } from "@signal-app/observable"
import { ControlEvent } from "../../entities/control/ControlEvent"
import { ControlItem } from "../../entities/control/ControlItem"
import { controlEventToItem } from "../../entities/control/transform"
import { ValueEventType } from "../../entities/control/ValueEventType"
import { TrackEvent } from "../../entities/event/TrackEvent"
import {
  createOrUpdate as createOrUpdateTrackEvent,
  updateEvents as updateTrackEvents,
} from "../../entities/track/mutations/composed"
import { getAll, getEventById } from "../../entities/track/queries/primitives"
import { Track } from "../../entities/track/Track"
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
