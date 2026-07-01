import { TimeSignatureEvent } from "midifile-ts"
import { action, computed, makeObservable, observable, transaction } from "mobx"
import { createModelSchema, object, primitive } from "serializr"
import { TickOrderedArray } from "../../data/OrdererdArray/TickOrderedArray"
import { DerivedValue } from "../../helpers/DerivedValue"
import { Emitter } from "../../helpers/emitter"
import { mobxToObservable } from "../../helpers/mobxToObservable"
import { Observable } from "../../helpers/observable"
import { Branded, Unsubscribe } from "../../types"
import {
  isNoteEvent,
  isProgramChangeEvent,
  isSetTempoEvent,
  isTimeSignatureEvent,
  isTrackNameEvent,
} from "./identify"
import { getTrackNameEvent } from "./selector"
import { isSignalTrackColorEvent, SignalTrackColorEvent } from "./signalEvents"
import { TrackColor } from "./TrackColor"
import { TrackEvent, TrackEventOf } from "./TrackEvent"
import { TrackEvents } from "./TrackEvents"

export type TrackId = Branded<number, "TrackId">
export const UNASSIGNED_TRACK_ID = -1 as TrackId

export class Track {
  id: TrackId = UNASSIGNED_TRACK_ID
  private readonly _events = new TickOrderedArray<TrackEvent>()
  private _eventsSnapshot: TrackEvent[] = []
  private readonly _name = new DerivedValue<string | undefined>(undefined)
  private readonly _color = new DerivedValue<SignalTrackColorEvent | undefined>(
    undefined,
  )
  private readonly _timeSignatureEvents = new DerivedValue<
    TrackEventOf<TimeSignatureEvent>[]
  >([])
  endOfTrack: number = 0
  channel: number | undefined = undefined

  getEventById = (id: number): TrackEvent | undefined => this._events.get(id)

  readonly onIdChanged: Observable
  readonly onIsRhythmTrackChanged: Observable
  readonly onIsConductorTrackChanged: Observable
  readonly onChannelChanged: Observable

  private readonly _onEventsChanged = new Emitter()
  private readonly _onProgramChangeEventsChanged = new Emitter()
  private readonly _onSetTempoEventsChanged = new Emitter()

  private unsubscribeReaction: Unsubscribe | null = null

  constructor() {
    makeObservable(this, {
      updateEvent: action,
      updateEvents: action,
      removeEvent: action,
      removeEvents: action,
      addEvent: action,
      addEvents: action,
      isConductorTrack: computed,
      isRhythmTrack: computed,
      events: computed,
      id: observable,
      channel: observable,
      endOfTrack: observable,
    })
    this.onIdChanged = mobxToObservable(this, "id")
    this.onIsRhythmTrackChanged = mobxToObservable(this, "isRhythmTrack")
    this.onIsConductorTrackChanged = mobxToObservable(this, "isConductorTrack")
    this.onChannelChanged = mobxToObservable(this, "channel")

    this.setupReactions()
  }

  private setupReactions() {
    this.unsubscribeReaction?.()
    this.unsubscribeReaction = this._events.onChange.subscribe((change) => {
      console.log("Track events changed", change)
      this._eventsSnapshot = [...this._events.getArray()]

      const changedEvents = ("added" in change ? change.added : []).concat(
        "removed" in change ? change.removed : [],
      )
      this._onEventsChanged.emit()
      this.didEventsChanged(changedEvents)
    })
  }

  private didEventsChanged = (changedEvents: readonly TrackEvent[]) => {
    if (
      this._onProgramChangeEventsChanged.listenerCount > 0 &&
      changedEvents.some(isProgramChangeEvent)
    ) {
      this._onProgramChangeEventsChanged.emit()
    }
    if (
      this._onSetTempoEventsChanged.listenerCount > 0 &&
      changedEvents.some(isSetTempoEvent)
    ) {
      this._onSetTempoEventsChanged.emit()
    }
    if (changedEvents.some(isTrackNameEvent)) {
      const nextName = getTrackNameEvent(this.events)?.text
      if (this._name.value !== nextName) {
        this._name.set(nextName)
      }
    }
    if (changedEvents.some(isSignalTrackColorEvent)) {
      const nextColor = TrackEvents.getColorEvent(this.events)
      if (this._color.value !== nextColor) {
        this._color.set(nextColor)
      }
    }
    if (changedEvents.some(isTimeSignatureEvent)) {
      this._timeSignatureEvents.set(this.events.filter(isTimeSignatureEvent))
    }
  }

  afterDeserialize() {
    this._eventsSnapshot = [...this.events]
    this.didEventsChanged(this.events)
    this.setupReactions()
  }

  get onProgramChangeEventsChanged() {
    return this._onProgramChangeEventsChanged
  }

  get onSetTempoEventsChanged() {
    return this._onSetTempoEventsChanged
  }

  get onTimeSignatureEventsChanged() {
    return this._timeSignatureEvents.onChanged
  }

  get onNameChanged() {
    return this._name.onChanged
  }

  get onColorChanged() {
    return this._color.onChanged
  }

  get onEventsChanged() {
    return this._onEventsChanged
  }

  get timeSignatureEvents() {
    return this._timeSignatureEvents.value
  }

  get events(): readonly TrackEvent[] {
    return this._events.getArray()
  }

  getEventsSnapshot = (): readonly TrackEvent[] => {
    return this._eventsSnapshot
  }

  updateEvent<T extends TrackEvent>(id: number, obj: Partial<T>): T | null {
    const newObj = TrackEvents.updateEvent(id, obj)(this._events)
    if (newObj !== null) {
      this.extendEndOfTrack(newObj)
    }
    return newObj
  }

  updateEvents<T extends TrackEvent>(events: Partial<T>[]) {
    this.transaction(() => {
      events.forEach((event) => {
        if (event.id === undefined) {
          return
        }
        this.updateEvent(event.id, event)
      })
    })
  }

  removeEvent(id: number) {
    this.removeEvents([id])
  }

  removeEvents(ids: number[]) {
    ids.forEach((id) => {
      this._events.remove(id)
    })
  }

  addEvent<T extends TrackEvent>(e: Omit<T, "id"> & { subtype?: string }): T {
    const newEvent = TrackEvents.addEvent(e)(this._events)
    this.extendEndOfTrack(newEvent)
    return newEvent
  }

  addEvents<T extends TrackEvent>(events: Omit<T, "id">[]): T[] {
    const result = this.transaction(() => {
      const dontMoveChannelEvent = this.isConductorTrack

      return events
        .filter((e) => (dontMoveChannelEvent ? e.type !== "channel" : true))
        .map((e) => this.addEvent(e))
    })
    return result
  }

  transaction<T>(func: (track: Track) => T) {
    return transaction(() => this._events.transaction(() => func(this)))
  }

  /* helper */

  createOrUpdate<T extends TrackEvent>(
    newEvent: Omit<T, "id"> & { subtype?: string; controllerType?: number },
  ): T {
    return TrackEvents.createOrUpdate(newEvent)(this._events)
  }

  updateEndOfTrack() {
    this.endOfTrack = TrackEvents.getMaxTick(this.events)
  }

  private extendEndOfTrack(newEvent: TrackEvent) {
    if (isNoteEvent(newEvent)) {
      this.endOfTrack = Math.max(
        this.endOfTrack,
        newEvent.tick + newEvent.duration,
      )
    }
  }

  get name() {
    return this._name.value
  }

  get color(): SignalTrackColorEvent | undefined {
    return this._color.value
  }

  setColor(color: TrackColor | null) {
    TrackEvents.setColor(color)(this._events)
  }

  setVolume(value: number, tick: number) {
    TrackEvents.setVolume(value, tick)(this._events)
  }
  setPan(value: number, tick: number) {
    TrackEvents.setPan(value, tick)(this._events)
  }
  setTempo = (bpm: number, tick: number) => {
    TrackEvents.setTempo(bpm, tick)(this._events)
  }
  setName(text: string) {
    TrackEvents.setName(text)(this._events)
  }

  get isConductorTrack() {
    return this.channel === undefined
  }

  get isRhythmTrack() {
    return this.channel === 9
  }

  clone() {
    const track = new Track()
    track.channel = this.channel
    track.addEvents(this.events.map((e) => ({ ...e })))
    return track
  }
}

createModelSchema(Track, {
  id: primitive(),
  _events: object(TickOrderedArray),
  channel: primitive(),
  endOfTrack: primitive(),
})
