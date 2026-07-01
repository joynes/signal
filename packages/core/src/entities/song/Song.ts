import {
  createModelSchema,
  deserialize,
  list,
  object,
  primitive,
  serialize,
} from "serializr"
import { Emitter } from "../../helpers/emitter"
import { ObservableValue } from "../../helpers/ObservableValue"
import { Observable } from "../../helpers/observable"
import { Measure } from "../measure/Measure"
import { Track, TrackId } from "../track"
import { collectAllEvents } from "./collectAllEvents"

const END_MARGIN = 480 * 30
const DEFAULT_TIME_BASE = 480

export class Song {
  private readonly _tracks = new ObservableValue<readonly Track[]>([])
  private _tracksSnapshot: Track[] = []
  private readonly _filepath = new ObservableValue<string>("")
  private readonly _timebase = new ObservableValue<number>(DEFAULT_TIME_BASE)
  private readonly _name = new ObservableValue<string>("")
  fileHandle: FileSystemFileHandle | null = null
  private readonly _cloudSongId = new ObservableValue<string | null>(null)
  cloudSongDataId: string | null = null
  private readonly _isSaved = new ObservableValue<boolean>(true)

  private lastTrackId = 0
  private readonly _measures = new ObservableValue<Measure[]>([])
  private unsubscribeConductorTrack: (() => void) | null = null
  private currentConductorTrack: Track | undefined = undefined
  private unsubscribeTrackChanges: (() => void)[] = []
  private readonly _onConductorTrackChanged = new Emitter()
  private readonly _onEndOfSongChanged = new Emitter()

  private unsubscribeSubscriptions: (() => void)[] = []

  constructor() {
    this.setupSubscriptions()
  }

  private setupSubscriptions() {
    this.unsubscribeSubscriptions.forEach((unsubscribe) => unsubscribe())
    this.unsubscribeTrackChanges.forEach((unsubscribe) => unsubscribe())
    this.unsubscribeTrackChanges = []
    this.unsubscribeSubscriptions = [
      this.onNameChanged.subscribe(() => {
        this.isSaved = false
      }),
      this.onTracksChanged.subscribe(() => {
        this._tracksSnapshot = [...this.tracks]
        this.subscribeToTrackChanges()
        this.refreshConductorTrackSubscription()
        this._onEndOfSongChanged.emit()
        this.isSaved = false
      }),
      this.onTimebaseChanged.subscribe(() => {
        this.updateMeasures()
      }),
    ]
    this._tracksSnapshot = [...this.tracks]
    this.subscribeToTrackChanges()
    this.refreshConductorTrackSubscription()
  }

  private subscribeToTrackChanges() {
    this.unsubscribeTrackChanges.forEach((unsubscribe) => unsubscribe())
    this.unsubscribeTrackChanges = this.tracks.flatMap((track) => [
      track.onEventsChanged.subscribe(() => {
        this.isSaved = false
        this._onEndOfSongChanged.emit()
      }),
      track.onChannelChanged.subscribe(() => {
        this.isSaved = false
        this.refreshConductorTrackSubscription()
      }),
    ])
  }

  private updateMeasures() {
    const timeSignatures = this.conductorTrack?.timeSignatureEvents ?? []
    this._measures.set(
      Measure.fromTimeSignatures(timeSignatures, this.timebase),
    )
  }

  private refreshConductorTrackSubscription() {
    const nextConductorTrack = this.conductorTrack
    const conductorTrackChanged =
      this.currentConductorTrack !== nextConductorTrack

    if (!conductorTrackChanged) {
      return
    }

    this.currentConductorTrack = nextConductorTrack
    this.unsubscribeConductorTrack?.()
    this.unsubscribeConductorTrack = null
    if (nextConductorTrack !== undefined) {
      this.unsubscribeConductorTrack =
        nextConductorTrack.onTimeSignatureEventsChanged.subscribe(() => {
          this.updateMeasures()
        })
    }
    this._onConductorTrackChanged.emit()
    this.updateMeasures()
  }

  private afterDeserialize() {
    this._tracksSnapshot = [...this.tracks]
    this.updateMeasures()
    this.setupSubscriptions()
  }

  private generateTrackId(): TrackId {
    return this.lastTrackId++ as TrackId
  }

  insertTrack(t: Track, index: number) {
    // 最初のトラックは Conductor Track なので channel を設定しない
    if (t.channel === undefined && this.tracks.length > 0) {
      t.channel = t.channel || this.tracks.length - 1
    }
    t.id = this.generateTrackId()
    const tracks = [...this.tracks]
    tracks.splice(index, 0, t)
    this.tracks = tracks
  }

  addTrack(t: Track) {
    this.insertTrack(t, this.tracks.length)
  }

  removeTrack(id: TrackId) {
    this.tracks = this.tracks.filter((t) => t.id !== id)
  }

  moveTrack(from: number, to: number) {
    const tracks = [...this.tracks]
    const [track] = tracks.splice(from, 1)
    tracks.splice(to, 0, track)
    this.tracks = tracks
  }

  get tracks(): readonly Track[] {
    return this._tracks.value
  }

  private set tracks(value: readonly Track[]) {
    this._tracks.set(value)
  }

  get onTracksChanged(): Observable {
    return this._tracks.onChanged
  }

  get conductorTrack(): Track | undefined {
    return this.tracks.find((t) => t.isConductorTrack)
  }

  get onConductorTrackChanged(): Observable {
    return this._onConductorTrackChanged
  }

  get name(): string {
    return this._name.value
  }

  set name(value: string) {
    this._name.set(value)
  }

  get onNameChanged(): Observable {
    return this._name.onChanged
  }

  get timebase(): number {
    return this._timebase.value
  }

  set timebase(value: number) {
    this._timebase.set(value)
  }

  get onTimebaseChanged(): Observable {
    return this._timebase.onChanged
  }

  get filepath(): string {
    return this._filepath.value
  }

  set filepath(value: string) {
    this._filepath.set(value)
  }

  get onFilepathChanged(): Observable {
    return this._filepath.onChanged
  }

  get isSaved(): boolean {
    return this._isSaved.value
  }

  set isSaved(value: boolean) {
    this._isSaved.set(value)
  }

  get onIsSavedChanged(): Observable {
    return this._isSaved.onChanged
  }

  get cloudSongId(): string | null {
    return this._cloudSongId.value
  }

  set cloudSongId(value: string | null) {
    this._cloudSongId.set(value)
  }

  get onCloudSongIdChanged(): Observable {
    return this._cloudSongId.onChanged
  }

  get onMeasuresChanged(): Observable {
    return this._measures.onChanged
  }

  getTrack(id: TrackId): Track | undefined {
    return this.tracks.find((t) => t.id === id)
  }

  getTracksSnapshot = (): readonly Track[] => {
    return this._tracksSnapshot
  }

  get measures(): Measure[] {
    return this._measures.value
  }

  get endOfSong(): number {
    const eos = Math.max(...this.tracks.map((t) => t.endOfTrack))
    return (eos ?? 0) + END_MARGIN
  }

  get onEndOfSongChanged(): Observable {
    return this._onEndOfSongChanged
  }

  updateEndOfSong() {
    this.tracks.forEach((t) => t.updateEndOfTrack())
  }

  get allEvents() {
    return collectAllEvents(this.tracks)
  }

  serialize() {
    return serialize(this)
  }

  // biome-ignore lint/suspicious/noExplicitAny: We need to accept any JSON object here
  static deserialize(json: any): Song {
    const song = deserialize(Song, json)
    song.afterDeserialize()
    song.tracks.forEach((t) => t.afterDeserialize())
    return song
  }
}

createModelSchema(Song, {
  tracks: list(object(Track)),
  name: primitive(),
  filepath: primitive(),
  timebase: primitive(),
  lastTrackId: primitive(),
  isSaved: primitive(),
})
