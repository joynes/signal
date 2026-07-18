import {
  Range,
  TrackEvent,
  TrackId,
  updateEventsInRange,
} from "@signal-app/core"
import type { AnyEvent } from "midifile-ts"
import { useCallback } from "react"
import { useMutateTrack } from "./useCommand"
import { useQuantizer } from "./useQuantizer"

// Update controller events in the range with linear interpolation values
export const useUpdateEventsInRange = (
  trackId: TrackId,
  filterEvent: (e: TrackEvent) => boolean,
  createEvent: (value: number) => AnyEvent,
) => {
  const { quantizeFloor, quantizeUnit } = useQuantizer()
  const mutate = useMutateTrack(trackId)

  return useCallback(
    (valueRange: Range, tickRange: Range) => {
      mutate(
        updateEventsInRange(
          filterEvent,
          createEvent,
          quantizeFloor,
          quantizeUnit,
          valueRange,
          tickRange,
        ),
      )
    },
    [mutate, filterEvent, createEvent, quantizeFloor, quantizeUnit],
  )
}
