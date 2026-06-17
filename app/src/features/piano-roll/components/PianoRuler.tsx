import React, { FC, useCallback, useState } from "react"
import { useContextMenu } from "../../../hooks/useContextMenu"
import { usePlayer } from "../../../hooks/usePlayer"
import { RulerTimeSignature, useRuler } from "../../../hooks/useRuler"
import { CanvasPianoRuler } from "./CanvasPianoRuler"
import { TimeSignatureDialog } from "./dialogs/TimeSignatureDialog"
import { RulerContextMenu } from "./menus/RulerContextMenu"

export interface PianoRulerProps {
  onMouseDown?: React.MouseEventHandler<HTMLCanvasElement>
  style?: React.CSSProperties
  className?: string
}

// null = closed
interface TimeSignatureDialogState {
  numerator: number
  denominator: number
}

const PianoRuler: FC<PianoRulerProps> = ({ onMouseDown, style, className }) => {
  const { onContextMenu, menuProps } = useContextMenu()
  const [timeSignatureDialogState, setTimeSignatureDialogState] =
    useState<TimeSignatureDialogState | null>(null)
  const [rightClickTick, setRightClickTick] = useState(0)
  const { loop, setLoopBegin, setLoopEnd, setPosition } = usePlayer()

  const {
    rulerBeats,
    timeSignatures,
    selectTimeSignature,
    clearSelectedTimeSignature,
    updateTimeSignature,
  } = useRuler()

  const onClickTimeSignature = useCallback(
    (e: React.MouseEvent, timeSignature: RulerTimeSignature, tick: number) => {
      if (e.detail === 2) {
        setTimeSignatureDialogState(timeSignature)
      } else {
        selectTimeSignature(timeSignature.id)
        if (e.button === 2) {
          setRightClickTick(tick)
          onContextMenu(e)
        }
      }
    },
    [selectTimeSignature, onContextMenu],
  )

  const onClickRuler = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, tick: number) => {
      if (e.nativeEvent.ctrlKey) {
        setLoopBegin(tick)
      } else if (e.nativeEvent.altKey) {
        setLoopEnd(tick)
      } else {
        setPosition(tick)
      }
      clearSelectedTimeSignature()
    },
    [setLoopBegin, setLoopEnd, setPosition, clearSelectedTimeSignature],
  )

  const onRightClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, tick: number) => {
      setRightClickTick(tick)
      onContextMenu(e)
    },
    [onContextMenu],
  )

  const closeOpenTimeSignatureDialog = useCallback(() => {
    setTimeSignatureDialogState(null)
  }, [])

  const okTimeSignatureDialog = useCallback(
    ({ numerator, denominator }: TimeSignatureDialogState) =>
      updateTimeSignature(numerator, denominator),
    [updateTimeSignature],
  )

  return (
    <>
      <CanvasPianoRuler
        loop={loop}
        rulerBeats={rulerBeats}
        timeSignatures={timeSignatures}
        onMouseDown={onMouseDown}
        onClickTimeSignature={onClickTimeSignature}
        onClickRuler={onClickRuler}
        onRightClick={onRightClick}
        style={style}
        className={className}
      />
      <RulerContextMenu {...menuProps} tick={rightClickTick} />
      <TimeSignatureDialog
        open={timeSignatureDialogState != null}
        initialNumerator={timeSignatureDialogState?.numerator}
        initialDenominator={timeSignatureDialogState?.denominator}
        onClose={closeOpenTimeSignatureDialog}
        onClickOK={okTimeSignatureDialog}
      />
    </>
  )
}

export default PianoRuler
