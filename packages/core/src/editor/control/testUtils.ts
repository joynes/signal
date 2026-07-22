import { ValueEventType } from "../../entities/control/ValueEventType"
import { Track } from "../../entities/track/Track"
import { TrackControlEditor } from "./TrackControlEditor"

export const createTrackControlEditor = (
  type: ValueEventType = { type: "controller", controllerType: 11 },
): TrackControlEditor => {
  const track = new Track()
  return new TrackControlEditor(track, type)
}
