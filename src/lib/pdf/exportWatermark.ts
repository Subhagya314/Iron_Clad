import { degrees, rgb, type PDFDocument, type PDFPage } from 'pdf-lib'

export type WatermarkExportOptions = {
  text: string
  opacity: number
}

export function drawWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  options: WatermarkExportOptions,
): void {
  const text = options.text.trim()
  if (!text) return

  const fontSize = Math.max(18, Math.min(viewportWidth, viewportHeight) * 0.12)
  ctx.save()
  ctx.globalAlpha = options.opacity
  ctx.fillStyle = '#6b7280'
  ctx.font = `700 ${fontSize}px "Public Sans", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.translate(viewportWidth / 2, viewportHeight / 2)
  ctx.rotate(-Math.PI / 4)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

export async function drawWatermarkOnPdfPage(
  page: PDFPage,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  options: WatermarkExportOptions,
): Promise<void> {
  const text = options.text.trim()
  if (!text) return

  const { width, height } = page.getSize()
  const size = Math.max(24, Math.min(width, height) * 0.11)
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, {
    x: width / 2 - textWidth / 2,
    y: height / 2 - size / 3,
    size,
    font,
    color: rgb(0.42, 0.45, 0.5),
    opacity: options.opacity,
    rotate: degrees(-45),
  })
}
