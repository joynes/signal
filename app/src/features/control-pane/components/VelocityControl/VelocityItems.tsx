import { useTheme } from "@emotion/react"
import { GLFallback, GLNode, HitArea, useTransform } from "@ryohey/webgl-react"
import { Rect } from "@signal-app/geometry"
import Color from "color"
import { FC, useCallback, useMemo } from "react"
import { colorToVec4, enhanceContrast } from "../../../../gl/color"
import { observeDrag } from "../../../../helpers/observeDrag"
import { VelocityTransform } from "../../entities/VelocityTransform"
import { useChangeNotesVelocity } from "../../hooks/useChangeNotesVelocity"
import { useVelocityItems } from "../../hooks/useVelocityItems"
import { LegacyVelocityItems } from "./LegacyVelocityItems"
import { IVelocityData, VelocityShader } from "./VelocityShader"

export interface VelocityItemsProps {
  velocityTransform: VelocityTransform
  zIndex?: number
}

export const VelocityItems: FC<VelocityItemsProps> = ({
  velocityTransform,
  ...props
}) => {
  const items = useVelocityItems(velocityTransform)
  const changeNotesVelocity = useChangeNotesVelocity()

  const onMouseDown = useCallback(
    (e: MouseEvent, noteId: number) => {
      const startY = e.clientY - e.offsetY
      const calcValue = (e: MouseEvent) => {
        const offsetY = e.clientY - startY
        return velocityTransform.getVelocity(offsetY)
      }

      e.stopPropagation()
      changeNotesVelocity([noteId], calcValue(e))

      observeDrag({
        onMouseMove: (e) => changeNotesVelocity([noteId], calcValue(e)),
      })
    },
    [changeNotesVelocity, velocityTransform],
  )

  return (
    <>
      <GLFallback
        component={_VelocityItems}
        fallback={LegacyVelocityItems}
        rects={items}
        {...props}
      />
      {items.map((rect) => (
        <VelocityHitArea
          key={rect.id}
          rect={rect}
          height={velocityTransform.maxHeight}
          zIndex={props.zIndex || 0}
          onMouseDown={onMouseDown}
        />
      ))}
    </>
  )
}

const _VelocityItems: FC<{
  rects: (Rect & IVelocityData)[]
  zIndex?: number
}> = ({ rects, zIndex }) => {
  const projectionMatrix = useTransform()
  const theme = useTheme()
  const baseColor = Color(theme.themeColor)
  const strokeColor = colorToVec4(
    enhanceContrast(baseColor, theme.isLightContent, 0.3),
  )
  const activeColor = useMemo(() => colorToVec4(baseColor), [baseColor])
  const selectedColor = useMemo(
    () => colorToVec4(baseColor.lighten(0.7)),
    [baseColor],
  )

  return (
    <GLNode
      shader={VelocityShader}
      uniforms={{
        projectionMatrix,
        strokeColor,
        activeColor,
        selectedColor,
      }}
      buffer={rects}
      zIndex={zIndex}
    />
  )
}

const VelocityHitArea = ({
  rect,
  height,
  zIndex,
  onMouseDown,
}: {
  rect: Rect & { id: number }
  height: number
  zIndex: number
  onMouseDown: (e: MouseEvent, noteId: number) => void
}) => {
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      onMouseDown(e, rect.id)
    },
    [onMouseDown, rect.id],
  )
  const bounds = useMemo(
    () => ({
      x: rect.x,
      y: 0,
      width: rect.width,
      height: height,
    }),
    [rect.x, rect.width, height],
  )
  return (
    <HitArea bounds={bounds} zIndex={zIndex} onMouseDown={handleMouseDown} />
  )
}
