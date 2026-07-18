import { TrackId } from "@signal-app/core"
import { useMemo } from "react"
import { useSong } from "./useSong"

export function useTrackQuery(id: TrackId) {
  const { tracks } = useSong()
  const track = useMemo(() => tracks.find((t) => t.id === id), [tracks, id])
  return track?.query
}
