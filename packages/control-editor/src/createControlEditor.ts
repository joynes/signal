import { Track } from "@signal-app/core"
import { ValueEventType } from "./entities/ValueEventType"
import { TrackControlEditor } from "./TrackControlEditor"
import { ControlEditor } from "./type"

export const createControlEditor = (
  track: Track,
  type: ValueEventType,
): ControlEditor => new TrackControlEditor(track, type)
