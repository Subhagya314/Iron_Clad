import type { NormalizedRect } from '../../lib/pdf/coordinateMap'
import { normalizedToPixelOverlay } from '../../lib/pdf/coordinateMap'
import { exemptionLabelForBox } from '../../types/redaction'

export type OverlayBox = NormalizedRect & {
  id: string
  status: 'draft' | 'locked'
  userId: string
  exemptionShortCodeSnapshot?: string
  exemptionTitleSnapshot?: string
}

type Props = {
  boxes: OverlayBox[]
}

export function RedactionOverlay({ boxes }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {boxes.map((box) => {
        const style = normalizedToPixelOverlay(box)
        const locked = box.status === 'locked'
        const label = exemptionLabelForBox(box)
        return (
          <div
            key={box.id}
            className={`absolute box-border border-2 ${locked ? 'border-amber-500/80' : 'border-red-500/80'}`}
            style={{
              left: style.left,
              top: style.top,
              width: style.width,
              height: style.height,
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}
          >
            {label ? (
              <span
                className="absolute bottom-0 left-0 right-0 truncate px-0.5 text-center text-[9px] font-medium leading-tight text-white"
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
