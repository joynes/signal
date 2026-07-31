import { isNoteEvent } from "@signal-app/core"
import { useMemo } from "react"
import { useEventView } from "../../../hooks/useEventView"
import { useTickScroll } from "../../../hooks/useTickScroll"
import { usePianoRoll } from "../../piano-roll/hooks/usePianoRoll"
import { VelocityTransform } from "../entities/VelocityTransform"

export function useVelocityItems(velocityTransform: VelocityTransform) {
  const { selectedNoteIds } = usePianoRoll()
  const { transform } = useTickScroll()
  const windowedEvents = useEventView()

  const items = useMemo(
    () =>
      windowedEvents.filter(isNoteEvent).map((note) => {
        const x = transform.getX(note.tick)
        const itemWidth = 5
        return {
          id: note.id,
          x,
          y: velocityTransform.getY(note.velocity),
          width: itemWidth,
          height: velocityTransform.getHeight(note.velocity),
          isSelected: selectedNoteIds.includes(note.id),
        }
      }),
    [windowedEvents, velocityTransform, transform, selectedNoteIds],
  )

  return items
}
