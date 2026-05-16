import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { NormalizedRect } from './coordinateMap'
import { normalizedToPdfLibRect } from './coordinateMap'

export type RedactionExportBox = NormalizedRect & {
  label?: string
}

export type PageRedactions = { pageIndex: number; boxes: RedactionExportBox[] }

const MIN_BOX_PTS = 8
const FONT_SIZE = 7
const PADDING = 2

function fitLabelInBox(
  text: string,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontSize: number,
): string {
  if (maxWidth <= 0) return ''
  let label = text
  while (label.length > 0 && font.widthOfTextAtSize(label, fontSize) > maxWidth) {
    label = label.slice(0, -1)
  }
  return label
}

/** Load original PDF bytes and draw black rectangles; optional exemption labels inside boxes. */
export async function exportRedactedPdf(
  originalPdfBytes: ArrayBuffer,
  byPage: PageRedactions[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)

  for (const { pageIndex, boxes } of byPage) {
    const page = doc.getPage(pageIndex)
    const { width, height } = page.getSize()
    for (const box of boxes) {
      const r = normalizedToPdfLibRect(box, width, height)
      if (r.width < MIN_BOX_PTS || r.height < MIN_BOX_PTS) continue

      page.drawRectangle({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        color: rgb(0, 0, 0),
      })

      const rawLabel = box.label?.trim()
      if (!rawLabel) continue

      const maxTextWidth = Math.max(0, r.width - PADDING * 2)
      const label = fitLabelInBox(rawLabel, maxTextWidth, font, FONT_SIZE)
      if (!label) continue

      const textWidth = font.widthOfTextAtSize(label, FONT_SIZE)
      const textX = r.x + (r.width - textWidth) / 2
      const textY = r.y + PADDING

      page.drawText(label, {
        x: textX,
        y: textY,
        size: FONT_SIZE,
        font,
        color: rgb(1, 1, 1),
      })
    }
  }

  return doc.save()
}
