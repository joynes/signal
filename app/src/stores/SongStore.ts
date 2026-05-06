import { emptySong, Song } from "@signal-app/core"
import { Observable } from "@signal-app/player/dist/helpers/observable"
import { makeObservable, observable } from "mobx"
import { mobxToObservable } from "../../../packages/core/src/helpers/mobxToObservable"

export class SongStore {
  song: Song = emptySong()

  readonly onSongChanged: Observable

  constructor() {
    makeObservable(this, {
      song: observable.ref,
    })

    this.onSongChanged = mobxToObservable(this, "song")
  }

  serialize() {
    return this.song.serialize()
  }
}
