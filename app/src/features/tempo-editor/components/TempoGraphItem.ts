import { Rect } from "../../../entities/geometry/Rect"

export interface TempoGraphItem {
  id: number
  bounds: Rect
  bpm: number
}
