import { useCallback, useEffect, useRef, useState } from 'react'
import { applyRedactionDisplayRect } from '../../lib/redactionGeometry'
import type { NormalizedRect } from '../../lib/pdf/coordinateMap'
import { normalizedToPixelOverlay } from '../../lib/pdf/coordinateMap'
import type { PageViewportLayout } from '../../lib/pdf/pageViewport'
import { exemptionLabelForBox } from '../../types/redaction'

export type OverlayBox = NormalizedRect & {
  id: string
  pageNumber?: number
  status: 'draft' | 'locked'
  userId: string
  exemptionCodeId?: string
  exemptionShortCodeSnapshot?: string
  exemptionTitleSnapshot?: string
}

type Props = {
  boxes: OverlayBox[]
  currentPage: number
  viewport: PageViewportLayout
  selectedBoxId?: string | null
  onBoxSelect?: (id: string) => void
  onBoxMove?: (boxId: string, rect: NormalizedRect) => void
  /** When false, boxes do not capture pointer events (text selection mode). */
  boxesInteractive?: boolean
  /** Fill color for locked (finalized) redaction boxes. */
  lockedFillColor?: string
}

export function RedactionOverlay({
  boxes,
  currentPage,
  viewport,
  selectedBoxId,
  onBoxSelect,
  onBoxMove,
  boxesInteractive = true,
  lockedFillColor = '#000000',
}: Props) {
  const visible = boxes.filter(
    (box) => box.pageNumber === undefined || box.pageNumber === currentPage,
  )

  const dragRef = useRef<{
    boxId: string
    startX: number
    startY: number
    orig: NormalizedRect
  } | null>(null)
  const [draggingBoxId, setDraggingBoxId] = useState<string | null>(null)
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 })
  const dragDeltaRef = useRef({ dx: 0, dy: 0 })

  const finishDrag = useCallback(() => {
    const drag = dragRef.current
    if (!drag || !onBoxMove) {
      dragRef.current = null
      setDraggingBoxId(null)
      dragDeltaRef.current = { dx: 0, dy: 0 }
      setDragDelta({ dx: 0, dy: 0 })
      return
    }

    const { orig, boxId } = drag
    const { dx, dy } = dragDeltaRef.current
    const nx = Math.max(0, Math.min(1 - orig.width, orig.x + dx / viewport.width))
    const ny = Math.max(0, Math.min(1 - orig.height, orig.y + dy / viewport.height))

    onBoxMove(boxId, { x: nx, y: ny, width: orig.width, height: orig.height })
    dragRef.current = null
    setDraggingBoxId(null)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [onBoxMove, viewport.height, viewport.width])

  useEffect(() => {
    if (!draggingBoxId) return

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const next = {
        dx: e.clientX - drag.startX,
        dy: e.clientY - drag.startY,
      }
      dragDeltaRef.current = next
      setDragDelta(next)
    }

    const onUp = () => finishDrag()

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [draggingBoxId, finishDrag])

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {visible.map((box) => {
        const style = normalizedToPixelOverlay(applyRedactionDisplayRect(box))
        const locked = box.status === 'locked'
        const label = exemptionLabelForBox(box)
        const selected = selectedBoxId === box.id
        const isDragging = draggingBoxId === box.id
        const canDrag = boxesInteractive && !locked && onBoxMove && onBoxSelect

        return (
          <div
            key={box.id}
            role={boxesInteractive && onBoxSelect ? 'button' : undefined}
            tabIndex={boxesInteractive && onBoxSelect ? 0 : undefined}
            className={`absolute box-border rounded-sm ${
              locked ? 'redaction-confirmed' : 'redaction-suggested'
            } ${boxesInteractive && onBoxSelect ? 'pointer-events-auto' : 'pointer-events-none'} ${
              canDrag ? 'cursor-move' : boxesInteractive ? 'cursor-pointer' : ''
            } ${selected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
            style={{
              left: style.left,
              top: style.top,
              width: style.width,
              height: style.height,
              ...(locked
                ? {
                    backgroundColor: lockedFillColor,
                    borderColor: lockedFillColor,
                  }
                : {}),
              transform: isDragging
                ? `translate(${dragDelta.dx}px, ${dragDelta.dy}px)`
                : undefined,
            }}
            onPointerDown={
              canDrag
                ? (e) => {
                    if (e.button !== 0) return
                    e.stopPropagation()
                    onBoxSelect(box.id)
                    dragRef.current = {
                      boxId: box.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      orig: { x: box.x, y: box.y, width: box.width, height: box.height },
                    }
                    dragDeltaRef.current = { dx: 0, dy: 0 }
                    setDragDelta({ dx: 0, dy: 0 })
                    setDraggingBoxId(box.id)
                  }
                : boxesInteractive && onBoxSelect
                  ? (e) => {
                      e.stopPropagation()
                      onBoxSelect(box.id)
                    }
                  : undefined
            }
            onKeyDown={
              boxesInteractive && onBoxSelect
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onBoxSelect(box.id)
                    }
                  }
                : undefined
            }
          >
            {label ? (
              <span
                className="pointer-events-none absolute bottom-0 left-0 right-0 truncate px-0.5 text-center text-[9px] font-medium leading-tight text-white"
                title={box.exemptionTitleSnapshot ?? label}
              >
                {label}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
