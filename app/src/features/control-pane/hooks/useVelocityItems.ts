import { isNoteEvent } from "@signal-app/core"
import { useMemo } from "react"
import { useEventView } from "../../../hooks/useEventView"
import { VelocityItem } from "../entities/VelocityItem"

export function useVelocityItems(): VelocityItem[] {
  const windowedEvents = useEventView()
  return useMemo(() => windowedEvents.filter(isNoteEvent), [windowedEvents])
}
