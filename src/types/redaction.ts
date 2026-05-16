import type { NormalizedRect } from '../lib/pdf/coordinateMap'

export type RedactionStatus = 'draft' | 'locked'

/** Normalized box: x, y, width, height are fractions of page width/height in [0, 1]. */
export type RedactionBoxInput = {
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  status: RedactionStatus
  exemptionCodeId?: string
}

export type ExemptionCode = {
  _id: string
  shortCode: string
  title: string
  description?: string
  category?: string
  sortOrder: number
  isActive: boolean
}

export type ExemptionSnapshot = {
  exemptionCodeId?: string
  exemptionShortCodeSnapshot?: string
  exemptionTitleSnapshot?: string
}

export type RedactionBox = RedactionBoxInput &
  ExemptionSnapshot & {
    _id: string
    documentId: string
    userId: string
    updatedAt: number
  }

export function exemptionLabelForBox(
  box: Pick<ExemptionSnapshot, 'exemptionShortCodeSnapshot' | 'exemptionTitleSnapshot'>,
): string | undefined {
  const code = box.exemptionShortCodeSnapshot?.trim()
  if (code) return code
  const title = box.exemptionTitleSnapshot?.trim()
  return title || undefined
}

export function toRedactionExportBox(
  box: NormalizedRect & ExemptionSnapshot,
): NormalizedRect & { label?: string } {
  const label = exemptionLabelForBox(box)
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    ...(label ? { label } : {}),
  }
}
