import { Track } from "@signal-app/core"
import { TrackTempoEditor } from "./TrackTempoEditor"
import { TempoEditor } from "./type"

export const createTempoEditor = (conductorTrack: Track): TempoEditor =>
  new TrackTempoEditor(conductorTrack)
