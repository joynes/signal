import {
  action,
  computed,
  makeObservable,
  observable,
  reaction,
  toJS,
} from "mobx"
import {
  createModelSchema,
  deserialize,
  list,
  object,
  primitive,
  serialize,
} from "serializr"
import { mobxToObservable } from "../../helpers/mobxToObservable"
import { ObservableValue } from "../../helpers/ObservableValue"
import { Observable } from "../../helpers/observable"
import { Measure } from "../measure/Measure"
import { Track, TrackId } from "../track"
import { collectAllEvents } from "./collectAllEvents"

const END_MARGIN = 480 * 30
const DEFAULT_TIME_BASE = 480

export class Song {
  tracks: readonly Track[] = []
  private _tracksSnapshot: Track[] = []
  filepath: string = ""
  timebase: number = DEFAULT_TIME_BASE
  name: string = ""
  fileHandle: FileSystemFileHandle | null = null
  cloudSongId: string | null = null
  cloudSongDataId: string | null = null
  isSaved = true

  private lastTrackId = 0
  private readonly _measures = new ObservableValue<Measure[]>([])
  private _unsubscribeConductorTrack: (() => void) | null = null

  readonly onTracksChanged: Observable
  readonly onConductorTrackChanged: Observable
  readonly onNameChanged: Observable
  readonly onTimebaseChanged: Observable
  readonly onFilepathChanged: Observable
  readonly onIsSavedChanged: Observable
  readonly onCloudSongIdChanged: Observable
  readonly onEndOfSongChanged: Observable

  private unsubscribeReactions: (() => void)[] = []

  constructor() {
    makeObservable(this, {
      addTrack: action,
      removeTrack: action,
      insertTrack: action,
      conductorTrack: computed,
      endOfSong: computed,
      allEvents: computed({ keepAlive: true }),
      tracks: observable.ref,
      filepath: observable,
      timebase: observable,
      name: observable,
      isSaved: observable,
    })

    this.onTracksChanged = mobxToObservable(this, "tracks")
    this.onConductorTrackChanged = mobxToObservable(this, "conductorTrack")
    this.onNameChanged = mobxToObservable(this, "name")
    this.onTimebaseChanged = mobxToObservable(this, "timebase")
    this.onFilepathChanged = mobxToObservable(this, "filepath")
    this.onIsSavedChanged = mobxToObservable(this, "isSaved")
    this.onCloudSongIdChanged = mobxToObservable(this, "cloudSongId")
    this.onEndOfSongChanged = mobxToObservable(this, "endOfSong")
    this.setupReactions()
  }

  private setupReactions() {
    this.unsubscribeReactions.forEach((unsubscribe) => unsubscribe())
    this.unsubscribeReactions = [
      reaction(
        () => {
          return [
            this.tracks.map((t) => ({
              channel: t.channel,
              events: toJS(t.events),
            })),
            this.name,
          ]
        },
        () => (this.isSaved = false),
      ),
      reaction(
        () => toJS(this.tracks),
        (tracks) => {
          this._tracksSnapshot = [...tracks]
        },
      ),
      this.onConductorTrackChanged.subscribe(() =>
        this.subscribeToConductorTrack(),
      ),
      this.onTimebaseChanged.subscribe(() => this.updateMeasures()),
    ]
    this.subscribeToConductorTrack()
  }

  private updateMeasures() {
    const timeSignatures = this.conductorTrack?.timeSignatureEvents ?? []
    this._measures.set(
      Measure.fromTimeSignatures(timeSignatures, this.timebase),
    )
  }

  private subscribeToConductorTrack() {
    const { conductorTrack } = this
    this._unsubscribeConductorTrack?.()
    this._unsubscribeConductorTrack = null
    if (conductorTrack !== undefined) {
      this._unsubscribeConductorTrack =
        conductorTrack.onTimeSignatureEventsChanged.subscribe(() => {
          this.updateMeasures()
        })
    }
    this.updateMeasures()
  }

  private afterDeserialize() {
    this._tracksSnapshot = [...this.tracks]
    this.updateMeasures()
    this.setupReactions()
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

  get conductorTrack(): Track | undefined {
    return this.tracks.find((t) => t.isConductorTrack)
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
