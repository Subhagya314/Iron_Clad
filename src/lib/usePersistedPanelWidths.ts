import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'iron-clad-panel-widths'

export const DEFAULT_LEFT_PANEL_WIDTH = 256
export const DEFAULT_RIGHT_PANEL_WIDTH = 320
const MIN_LEFT = 200
const MAX_LEFT = 480
const MIN_RIGHT = 220
const MAX_RIGHT = 560

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function readStoredWidths(): { left: number; right: number } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { left?: unknown; right?: unknown }
    const left =
      typeof parsed.left === 'number'
        ? clamp(parsed.left, MIN_LEFT, MAX_LEFT)
        : DEFAULT_LEFT_PANEL_WIDTH
    const right =
      typeof parsed.right === 'number'
        ? clamp(parsed.right, MIN_RIGHT, MAX_RIGHT)
        : DEFAULT_RIGHT_PANEL_WIDTH
    return { left, right }
  } catch {
    return null
  }
}

export function usePersistedPanelWidths() {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_PANEL_WIDTH)
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_PANEL_WIDTH)

  useEffect(() => {
    const stored = readStoredWidths()
    if (stored) {
      setLeftWidth(stored.left)
      setRightWidth(stored.right)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ left: leftWidth, right: rightWidth }),
    )
  }, [leftWidth, rightWidth])

  const resizeLeft = useCallback((deltaX: number) => {
    setLeftWidth((w) => clamp(w + deltaX, MIN_LEFT, MAX_LEFT))
  }, [])

  const resizeRight = useCallback((deltaX: number) => {
    setRightWidth((w) => clamp(w - deltaX, MIN_RIGHT, MAX_RIGHT))
  }, [])

  const resetLeft = useCallback(() => setLeftWidth(DEFAULT_LEFT_PANEL_WIDTH), [])
  const resetRight = useCallback(() => setRightWidth(DEFAULT_RIGHT_PANEL_WIDTH), [])

  return {
    leftWidth,
    rightWidth,
    resizeLeft,
    resizeRight,
    resetLeft,
    resetRight,
  }
}
