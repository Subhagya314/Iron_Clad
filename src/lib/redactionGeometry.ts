import type { NormalizedRect } from './pdf/coordinateMap'

/** Extra height added below each redaction box (fraction of box height). */
export const REDACTION_DOWNWARD_EXTEND_RATIO = 0.05

/** Extends the box downward without moving the top edge; clamps to the page. */
export function applyRedactionDisplayRect(rect: NormalizedRect): NormalizedRect {
  const extra = rect.height * REDACTION_DOWNWARD_EXTEND_RATIO
  const height = Math.min(rect.height + extra, Math.max(0, 1 - rect.y))
  return { ...rect, height }
}
