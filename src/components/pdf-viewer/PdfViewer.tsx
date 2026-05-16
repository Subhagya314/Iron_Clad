import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import {
  clientToViewportPixels,
  viewportPixelsToNormalized,
} from '../../lib/pdf/pageViewport'
import { usePdfPageText } from '../../lib/hooks/usePdfPageText'
import { useRedactionDraw } from '../../lib/hooks/useRedactionDraw'
import {
  itemAtPoint,
  itemsInSelectionRange,
  lineBoundsFromSelection,
  type TextItemBounds,
} from '../../lib/pdf/pdfTextItems'
import {
  SCALE_DEFAULT,
  clampScale,
  zoomIn,
  zoomOut,
} from '../../lib/pdf/zoomConstants'
import { usePdfDocument } from '../../lib/hooks/usePdfDocument'
import { REDACTION_DOWNWARD_EXTEND_RATIO } from '../../lib/redactionGeometry'
import { useRedactionPrefs } from '../../lib/redactionPrefs'
import { Icon } from '../ui/Icon'
import { PageNavigator } from './PageNavigator'
import { RedactionGuidance } from './RedactionGuidance'
import { PdfPageCanvas, type PageCanvasLayout } from './PdfPageCanvas'
import { RedactionOverlay, type OverlayBox } from './RedactionOverlay'
import { RedactionToolbar, type RedactionToolMode } from './RedactionToolbar'
import { TextSelectionPreview } from './TextSelectionPreview'
import { WatermarkPreview } from './WatermarkPreview'
import { ZoomControls } from './ZoomControls'

type Props = {
  pdfUrl: string | undefined
  boxes?: OverlayBox[]
  onCreateBox?: (
    pageNumber: number,
    rect: { x: number; y: number; width: number; height: number },
  ) => void
  onUpdateExemption?: (boxId: string, exemptionCodeId: string | null) => void | Promise<void>
  onMoveBox?: (boxId: string, rect: { x: number; y: number; width: number; height: number }) => void | Promise<void>
  onDeleteBox?: (boxId: string) => void | Promise<void>
  canPersist?: boolean
  emptyAction?: React.ReactNode
}

const MIN_BOX_PX = 8
const MIN_TEXT_DRAG_PX = 4
/** Warn when text selection covers more than this fraction of page glyphs. */
const MAX_PAGE_TEXT_SELECT_RATIO = 0.85

export function PdfViewer({
  pdfUrl,
  boxes = [],
  onCreateBox,
  onUpdateExemption,
  onMoveBox,
  onDeleteBox,
  canPersist = false,
  emptyAction,
}: Props) {
  const { pdf, error, loading } = usePdfDocument(pdfUrl)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(SCALE_DEFAULT)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)
  const { fillColor, setFillColor, watermark } = useRedactionPrefs()
  const [toolMode, setToolMode] = useState<RedactionToolMode>('marquee')

  const [textDragStart, setTextDragStart] = useState<{ x: number; y: number } | null>(null)
  const [highlightedText, setHighlightedText] = useState<TextItemBounds[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workspaceFocusRef = useRef<HTMLDivElement>(null)
  const captureTargetRef = useRef<HTMLElement | null>(null)
  const prevScaleRef = useRef(scale)
  const [pageLayout, setPageLayout] = useState<PageCanvasLayout | null>(null)
  const capturePointerIdRef = useRef<number | null>(null)
  const { draft, onPointerDown, onPointerMove, onPointerUp, clearDraft } = useRedactionDraw()

  const { textData, textLoading } = usePdfPageText(pdf, page, scale)
  const exemptionCodes = useQuery(api.exemptionCodes.list, canPersist ? {} : 'skip')
  const seedDefaults = useMutation(api.exemptionCodes.seedDefaults)

  const totalPages = pdf?.numPages ?? 0
  const selectedBox = boxes.find((b) => b.id === selectedBoxId)
  const canDraw = Boolean(onCreateBox)
  const boxesInteractive = toolMode === 'marquee' || toolMode === 'move'

  const clientToViewport = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas || !pageLayout) return null
      return clientToViewportPixels(clientX, clientY, canvas, pageLayout)
    },
    [pageLayout],
  )

  const releaseCapture = useCallback(() => {
    const el = captureTargetRef.current
    const pointerId = capturePointerIdRef.current
    if (el && pointerId !== null) {
      try {
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
      } catch {
        /* ignore */
      }
    }
    captureTargetRef.current = null
    capturePointerIdRef.current = null
  }, [])

  const finishMarqueeDraw = useCallback(() => {
    const finalRect = onPointerUp()
    if (!finalRect || !onCreateBox) {
      clearDraft()
      releaseCapture()
      return
    }
    if (!pageLayout) {
      clearDraft()
      releaseCapture()
      return
    }
    if (finalRect.width < MIN_BOX_PX || finalRect.height < MIN_BOX_PX) {
      clearDraft()
      releaseCapture()
      return
    }
    onCreateBox(page, viewportPixelsToNormalized(finalRect, pageLayout))
    clearDraft()
    releaseCapture()
  }, [clearDraft, onCreateBox, onPointerUp, page, pageLayout, releaseCapture])

  const handleMarqueePointerDown = (e: React.PointerEvent) => {
    if (!onCreateBox || e.button !== 0 || toolMode !== 'marquee') return
    setSelectedBoxId(null)
    captureTargetRef.current = e.currentTarget as HTMLElement
    capturePointerIdRef.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = clientToViewport(e.clientX, e.clientY)
    if (pt) onPointerDown(pt.x, pt.y)
  }

  const handleMarqueePointerMove = (e: React.PointerEvent) => {
    const pt = clientToViewport(e.clientX, e.clientY)
    if (pt) onPointerMove(pt.x, pt.y)
  }

  const updateTextHighlight = useCallback(
    (start: { x: number; y: number }, current: { x: number; y: number }) => {
      if (!textData?.items.length) {
        setHighlightedText([])
        return
      }
      const dragW = current.x - start.x
      const dragH = current.y - start.y
      if (Math.abs(dragW) < MIN_TEXT_DRAG_PX && Math.abs(dragH) < MIN_TEXT_DRAG_PX) {
        const hit = itemAtPoint(textData.items, start.x, start.y)
        setHighlightedText(hit ? [hit] : [])
        return
      }
      setHighlightedText(itemsInSelectionRange(textData.items, start, current))
    },
    [textData],
  )

  const handleTextPointerDown = (e: React.PointerEvent) => {
    if (!onCreateBox || e.button !== 0 || toolMode !== 'select-text') return
    const pt = clientToViewport(e.clientX, e.clientY)
    if (!pt) return
    setSelectedBoxId(null)
    captureTargetRef.current = e.currentTarget as HTMLElement
    capturePointerIdRef.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    setTextDragStart(pt)
    updateTextHighlight(pt, pt)
  }

  const handleTextPointerMove = (e: React.PointerEvent) => {
    if (!textDragStart) return
    const pt = clientToViewport(e.clientX, e.clientY)
    if (!pt) return
    updateTextHighlight(textDragStart, pt)
  }

  const finishTextSelection = useCallback(() => {
    if (!pageLayout || !onCreateBox || highlightedText.length === 0) {
      setTextDragStart(null)
      setHighlightedText([])
      releaseCapture()
      return
    }

    const totalItems = textData?.items.length ?? 0
    if (
      totalItems > 0 &&
      highlightedText.length / totalItems >= MAX_PAGE_TEXT_SELECT_RATIO &&
      !window.confirm(
        `Select ${highlightedText.length} text regions on this page? For full-document redaction, consider Marquee per section or export review.`,
      )
    ) {
      setTextDragStart(null)
      setHighlightedText([])
      releaseCapture()
      return
    }

    const lineRects = lineBoundsFromSelection(highlightedText)
    for (const rect of lineRects) {
      if (rect.width >= MIN_BOX_PX && rect.height >= MIN_BOX_PX) {
        onCreateBox(page, viewportPixelsToNormalized(rect, pageLayout))
      }
    }

    setTextDragStart(null)
    setHighlightedText([])
    releaseCapture()
  }, [highlightedText, onCreateBox, page, pageLayout, releaseCapture, textData?.items.length])

  const handleDelete = useCallback(() => {
    if (!selectedBoxId || !onDeleteBox) return
    void onDeleteBox(selectedBoxId)
    setSelectedBoxId(null)
  }, [onDeleteBox, selectedBoxId])

  const fitToWidth = useCallback(async () => {
    const scroll = scrollRef.current
    if (!pdf || !scroll) {
      setScale(SCALE_DEFAULT)
      return
    }
    try {
      const pdfPage = await pdf.getPage(page)
      const viewport = pdfPage.getViewport({ scale: 1 })
      const padding = 32
      const available = Math.max(scroll.clientWidth - padding, 200)
      setScale(clampScale(available / viewport.width))
    } catch {
      setScale(SCALE_DEFAULT)
    }
  }, [pdf, page])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

      if (e.key === 'Escape') {
        clearDraft()
        releaseCapture()
        setTextDragStart(null)
        setHighlightedText([])
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxId && onDeleteBox) {
        e.preventDefault()
        handleDelete()
        return
      }
      if (pdfUrl && (e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
        const t = e.target
        if (
          !(t instanceof HTMLInputElement) &&
          !(t instanceof HTMLSelectElement) &&
          !(t instanceof HTMLTextAreaElement)
        ) {
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearDraft, handleDelete, onDeleteBox, pdfUrl, releaseCapture, selectedBoxId])

  useEffect(() => {
    if (!pdfUrl || !pdf) return
    void fitToWidth()
  }, [pdfUrl, pdf]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPageLayout(null)
  }, [page, scale, pdfUrl])

  const handlePageLayoutReady = useCallback((layout: PageCanvasLayout) => {
    setPageLayout(layout)
  }, [])

  const pageOverlayReady =
    pageLayout !== null && pageLayout.scale === scale && pageLayout.width > 0

  const overlayAligned = pageOverlayReady

  useEffect(() => {
    const scroll = scrollRef.current
    if (!scroll || !overlayAligned) return

    const ratio = scale / prevScaleRef.current
    if (Math.abs(ratio - 1) < 0.001) return

    const cx = scroll.scrollLeft + scroll.clientWidth / 2
    const cy = scroll.scrollTop + scroll.clientHeight / 2
    scroll.scrollLeft = Math.max(0, cx * ratio - scroll.clientWidth / 2)
    scroll.scrollTop = Math.max(0, cy * ratio - scroll.clientHeight / 2)
    prevScaleRef.current = scale
  }, [scale, overlayAligned])

  useEffect(() => {
    prevScaleRef.current = scale
  }, [pdfUrl, page])

  useEffect(() => {
    setTextDragStart(null)
    setHighlightedText([])
  }, [page, toolMode])

  const onExemptionChange = async (value: string) => {
    if (!selectedBoxId || !onUpdateExemption) return
    await onUpdateExemption(selectedBoxId, value === '' ? null : value)
  }

  return (
    <div
      ref={workspaceFocusRef}
      tabIndex={-1}
      className="flex h-full min-h-0 flex-col outline-none"
    >
      <RedactionGuidance />
      <div className="mb-4 flex flex-col gap-3 border-b border-outline-variant pb-4 sm:gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-on-surface sm:text-2xl">Document workspace</h2>
          <p className="text-xs text-on-surface-variant sm:text-sm">
            Draw redaction boxes on the PDF • {totalPages > 0 ? `${totalPages} pages` : 'No document'}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <PageNavigator
            page={page}
            totalPages={totalPages}
            onChange={(p) => {
              setPage(Math.min(Math.max(1, p), Math.max(1, totalPages)))
              setSelectedBoxId(null)
            }}
          />
          <RedactionToolbar
            mode={toolMode}
            onModeChange={(m) => {
              setToolMode(m)
              clearDraft()
              releaseCapture()
              setTextDragStart(null)
              setHighlightedText([])
              if (m === 'select-text' || m === 'marquee') setSelectedBoxId(null)
            }}
            canDraw={canDraw}
            hasSelectedBox={Boolean(selectedBoxId)}
            onDelete={canPersist && onDeleteBox ? handleDelete : undefined}
            fillColor={fillColor}
            onFillColorChange={setFillColor}
          />
          {toolMode === 'select-text' && textLoading && (
            <span className="text-xs text-on-surface-variant">Loading text…</span>
          )}
          {toolMode === 'select-text' && !textLoading && textData?.items.length === 0 && (
            <span className="text-xs text-amber-800">No text on this page — use Marquee</span>
          )}
          {canPersist && onUpdateExemption && (
            <label className="flex w-full min-w-0 items-center gap-2 text-sm text-on-surface sm:w-auto">
              <span className="shrink-0">Reason</span>
              <select
                className="min-w-0 flex-1 rounded border border-outline-variant bg-surface px-2 py-1 text-sm disabled:opacity-50 sm:max-w-[280px] sm:flex-none"
                disabled={!selectedBoxId}
                value={selectedBox?.exemptionCodeId ?? ''}
                onChange={(e) => void onExemptionChange(e.target.value)}
              >
                <option value="">— none —</option>
                {exemptionCodes?.map((code) => (
                  <option key={code._id} value={code._id}>
                    {code.shortCode} — {code.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canPersist && (
            <button
              type="button"
              className="shrink-0 text-sm text-primary underline-offset-2 hover:underline"
              onClick={() => void seedDefaults({})}
            >
              {exemptionCodes?.length === 0 ? 'Load standard reasons' : 'Add missing reasons'}
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-sm text-on-surface-variant">Loading PDF…</p>}
      {error && <p className="text-sm text-error">{error.message}</p>}

      {!pdfUrl && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-outline-variant bg-surface p-12 text-center">
          <Icon name="picture_as_pdf" className="text-on-surface-variant" size={48} />
          <p className="max-w-sm text-sm text-on-surface-variant">
            Upload a PDF from the sidebar. When Convex is configured, picks sync across your accessible documents.
          </p>
          {emptyAction}
        </div>
      )}

      {pdfUrl && !canPersist && onCreateBox === undefined && (
        <p className="mb-2 text-sm text-amber-800">
          Upload a PDF to Convex to draw and persist redactions on this document.
        </p>
      )}

      {pdfUrl && (
        <div ref={scrollRef} className="flex flex-1 justify-center overflow-auto pb-16">
          <div
            ref={canvasWrapRef}
            className="relative inline-block bg-white shadow-md"
            style={
              pageLayout
                ? { width: pageLayout.width, height: pageLayout.height }
                : undefined
            }
          >
            <PdfPageCanvas
              ref={canvasRef}
              pdf={pdf}
              pageNumber={page}
              scale={scale}
              onLayoutReady={handlePageLayoutReady}
            />
            {canDraw && toolMode === 'marquee' && (
              <div
                className="absolute inset-0 z-[2] cursor-crosshair touch-none"
                onPointerDown={handleMarqueePointerDown}
                onPointerMove={handleMarqueePointerMove}
                onPointerUp={finishMarqueeDraw}
                onPointerCancel={finishMarqueeDraw}
              />
            )}
            {canDraw && toolMode === 'select-text' && (
              <div
                className="absolute inset-0 z-[12] cursor-text touch-none"
                onPointerDown={handleTextPointerDown}
                onPointerMove={handleTextPointerMove}
                onPointerUp={finishTextSelection}
                onPointerCancel={finishTextSelection}
              />
            )}
            {watermark.enabled && overlayAligned && (
              <WatermarkPreview text={watermark.text} opacity={watermark.opacity} />
            )}
            {overlayAligned && (
              <RedactionOverlay
                boxes={boxes}
                currentPage={page}
                viewport={pageLayout!}
                selectedBoxId={canPersist ? selectedBoxId : undefined}
                onBoxSelect={canPersist ? setSelectedBoxId : undefined}
                onBoxMove={canPersist && onMoveBox ? (id, rect) => void onMoveBox(id, rect) : undefined}
                boxesInteractive={boxesInteractive}
                lockedFillColor={fillColor}
              />
            )}
            {pageOverlayReady && toolMode === 'select-text' && (
              <TextSelectionPreview items={highlightedText} />
            )}
            {overlayAligned && draft && (
              <div
                className="redaction-suggested pointer-events-none absolute z-[4] box-border rounded-sm"
                style={{
                  left: draft.left,
                  top: draft.top,
                  width: draft.width,
                  height: draft.height * (1 + REDACTION_DOWNWARD_EXTEND_RATIO),
                }}
              />
            )}
          </div>
        </div>
      )}

      {pdfUrl && (
        <ZoomControls
          scale={scale}
          onZoomIn={() => setScale(zoomIn(scale))}
          onZoomOut={() => setScale(zoomOut(scale))}
          onReset={() => void fitToWidth()}
        />
      )}
    </div>
  )
}
