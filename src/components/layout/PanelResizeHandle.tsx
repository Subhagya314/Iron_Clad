import { useCallback } from 'react'

type Props = {
  onResize: (deltaX: number) => void
  onReset?: () => void
  /** Handle sits on the inner edge of the panel (right edge for left panel, left edge for right). */
  edge: 'inner-start' | 'inner-end'
  label: string
}

export function PanelResizeHandle({ onResize, onReset, edge, label }: Props) {
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      const handle = e.currentTarget
      handle.setPointerCapture(e.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      let lastX = e.clientX

      const onPointerMove = (ev: PointerEvent) => {
        const deltaX = ev.clientX - lastX
        lastX = ev.clientX
        if (deltaX !== 0) onResize(deltaX)
      }

      const end = () => {
        handle.releasePointerCapture(e.pointerId)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', end)
        window.removeEventListener('pointercancel', end)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', end)
      window.addEventListener('pointercancel', end)
    },
    [onResize],
  )

  const positionClass =
    edge === 'inner-end'
      ? 'right-0 translate-x-1/2'
      : 'left-0 -translate-x-1/2'

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={`${label} — drag to resize, double-click to reset`}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      className={`absolute top-0 z-50 h-full w-2 shrink-0 touch-none ${positionClass} group`}
    >
      <div className="mx-auto h-full w-px bg-outline-variant/60 transition-colors group-hover:w-0.5 group-hover:bg-primary group-active:bg-primary" />
      <div aria-hidden className="absolute inset-y-0 -left-1 w-3 cursor-col-resize" />
    </div>
  )
}
