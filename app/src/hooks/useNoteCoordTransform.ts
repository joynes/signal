import { useCallback, useMemo } from "react"
import { Point } from "../entities/geometry/Point"
import { NoteCoordTransform } from "../entities/transform/NoteCoordTransform"
import { useKeyScroll } from "./useKeyScroll"
import { usePianoRollTickScroll } from "./usePianoRoll"
import { useTickScroll } from "./useTickScroll"

export function useNoteCoordTransform() {
  return {
    get transform() {
      const { transform: tickTransform } = usePianoRollTickScroll()
      const { transform: keyTransform } = useKeyScroll()
      return useMemo(
        () => new NoteCoordTransform(tickTransform, keyTransform),
        [tickTransform, keyTransform],
      )
    },
    get scrollBy() {
      const { setScrollLeftInPixels } = useTickScroll()
      const { setScrollTopInPixels } = useKeyScroll()
      return useCallback(
        (dx: number, dy: number) => {
          setScrollLeftInPixels((prev) => prev - dx)
          setScrollTopInPixels((prev) => prev - dy)
        },
        [setScrollLeftInPixels, setScrollTopInPixels],
      )
    },
    // convert mouse position to the local coordinate on the canvas
    get getLocal() {
      const { scrollLeft } = useTickScroll()
      const { scrollTop } = useKeyScroll()
      return useCallback(
        (e: { offsetX: number; offsetY: number }): Point => ({
          x: e.offsetX + scrollLeft,
          y: e.offsetY + scrollTop,
        }),
        [scrollLeft, scrollTop],
      )
    },
  }
}
