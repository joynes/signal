import { SetTempoEventWithNextTick } from "@signal-app/core"
import { TempoGraphItem } from "../components/TempoGraphItem"
import { TempoCoordTransform } from "../entities/TempoCoordTransform"

export const transformEvents = (
  events: readonly SetTempoEventWithNextTick[],
  transform: TempoCoordTransform,
  maxX: number,
): TempoGraphItem[] => {
  // events are already sorted and include next tick from core query
  return events.map(({ event, nextTick }) => {
    const bpm = (60 * 1000000) / event.microsecondsPerBeat
    const x = Math.round(transform.getX(event.tick))
    const y = Math.round(transform.getY(bpm))
    const nextX =
      nextTick !== undefined ? Math.round(transform.getX(nextTick)) : maxX

    return {
      id: event.id,
      bounds: {
        x,
        y,
        width: nextX - x,
        height: transform.height - y + 1, // fit to screen bottom
      },
      microsecondsPerBeat: event.microsecondsPerBeat,
    }
  })
}
