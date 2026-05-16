import * as pdfjs from 'pdfjs-dist'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { setupPdfWorker } from './setupPdfWorker'
import type { PageRedactions, RedactionExportBox } from './exportVisualRedactionPreview'
import { drawWatermarkOnCanvas, drawWatermarkOnPdfPage, type WatermarkExportOptions } from './exportWatermark'

setupPdfWorker()

/** Higher scale = sharper rasterized release pages. */
const RELEASE_RASTER_SCALE = 2
const MIN_BOX_PX = 4

export type { PageRedactions }

export type ReleaseExportOptions = {
  fillColor?: string
  watermark?: WatermarkExportOptions | null
}

async function loadPdfFromBytes(bytes: ArrayBuffer): Promise<pdfjs.PDFDocumentProxy> {
  return pdfjs.getDocument({ data: bytes.slice(0) }).promise
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode release page image'))
          return
        }
        void blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)))
      },
      'image/png',
      1,
    )
  })
}

async function renderPageToCanvas(
  pdf: pdfjs.PDFDocumentProxy,
  pageIndex: number,
): Promise<{
  canvas: HTMLCanvasElement
  viewportWidth: number
  viewportHeight: number
  widthPts: number
  heightPts: number
}> {
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale: RELEASE_RASTER_SCALE })
  const sizePts = page.getViewport({ scale: 1 })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const task = page.render({ canvasContext: ctx, viewport, canvas })
  await task.promise

  return {
    canvas,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    widthPts: sizePts.width,
    heightPts: sizePts.height,
  }
}

function burnRedactionsOnCanvas(
  ctx: CanvasRenderingContext2D,
  boxes: RedactionExportBox[],
  viewportWidth: number,
  viewportHeight: number,
  fillColor: string,
): void {
  ctx.fillStyle = fillColor
  for (const box of boxes) {
    const left = box.x * viewportWidth
    const top = box.y * viewportHeight
    const w = box.width * viewportWidth
    const h = box.height * viewportHeight
    if (w < MIN_BOX_PX || h < MIN_BOX_PX) continue
    ctx.fillRect(left, top, w, h)
  }
}

function stripDocumentMetadata(doc: PDFDocument): void {
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setProducer('Iron Clad')
  doc.setCreator('Iron Clad')
}

/**
 * Release export: pages with redactions become a single image (text burned in).
 * Pages without redactions are copied as vector PDF (text remains selectable).
 */
export async function exportReleaseRedactedPdf(
  originalPdfBytes: ArrayBuffer,
  byPage: PageRedactions[],
  options: ReleaseExportOptions = {},
): Promise<Uint8Array> {
  const fillColor = options.fillColor ?? '#000000'
  const watermark = options.watermark ?? null

  const pdfjsDoc = await loadPdfFromBytes(originalPdfBytes)
  const srcDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true })
  const outDoc = await PDFDocument.create()
  const watermarkFont = watermark
    ? await outDoc.embedFont(StandardFonts.HelveticaBold)
    : null

  const boxesByPage = new Map<number, RedactionExportBox[]>()
  for (const { pageIndex, boxes } of byPage) {
    if (boxes.length > 0) boxesByPage.set(pageIndex, boxes)
  }

  const pageCount = pdfjsDoc.numPages

  try {
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const boxes = boxesByPage.get(pageIndex)
      if (boxes && boxes.length > 0) {
        const { canvas, viewportWidth, viewportHeight, widthPts, heightPts } =
          await renderPageToCanvas(pdfjsDoc, pageIndex)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('2D canvas context unavailable')
        burnRedactionsOnCanvas(ctx, boxes, viewportWidth, viewportHeight, fillColor)
        if (watermark) {
          drawWatermarkOnCanvas(ctx, viewportWidth, viewportHeight, watermark)
        }

        const pngBytes = await canvasToPngBytes(canvas)
        const image = await outDoc.embedPng(pngBytes)
        const page = outDoc.addPage([widthPts, heightPts])
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: widthPts,
          height: heightPts,
        })
      } else {
        const [copied] = await outDoc.copyPages(srcDoc, [pageIndex])
        const page = outDoc.addPage(copied)
        if (watermark && watermarkFont) {
          await drawWatermarkOnPdfPage(page, watermarkFont, watermark)
        }
      }
    }
  } finally {
    void pdfjsDoc.destroy()
  }

  stripDocumentMetadata(outDoc)
  return outDoc.save()
}
