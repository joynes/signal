import { ControllerEvent, PitchBendEvent } from "midifile-ts"
import { TrackEventOf } from "../event/TrackEvent"

export type ControlEvent = TrackEventOf<ControllerEvent | PitchBendEvent>
