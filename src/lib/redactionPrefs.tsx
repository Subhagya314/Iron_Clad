import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'iron-clad-redaction-prefs'

export const DEFAULT_REDACTION_FILL = '#000000'

export type WatermarkPrefs = {
  enabled: boolean
  text: string
  opacity: number
}

export type RedactionPrefs = {
  fillColor: string
  watermark: WatermarkPrefs
}

const DEFAULT_PREFS: RedactionPrefs = {
  fillColor: DEFAULT_REDACTION_FILL,
  watermark: {
    enabled: false,
    text: 'CONFIDENTIAL',
    opacity: 0.18,
  },
}

function clampOpacity(value: number) {
  return Math.min(0.6, Math.max(0.05, value))
}

function normalizeHex(color: string): string {
  const trimmed = color.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const h = trimmed.slice(1)
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase()
  }
  return DEFAULT_REDACTION_FILL
}

function readStoredPrefs(): RedactionPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<RedactionPrefs> & {
      watermark?: Partial<WatermarkPrefs>
    }
    return {
      fillColor:
        typeof parsed.fillColor === 'string'
          ? normalizeHex(parsed.fillColor)
          : DEFAULT_PREFS.fillColor,
      watermark: {
        enabled: Boolean(parsed.watermark?.enabled),
        text:
          typeof parsed.watermark?.text === 'string' && parsed.watermark.text.trim()
            ? parsed.watermark.text.trim().slice(0, 80)
            : DEFAULT_PREFS.watermark.text,
        opacity:
          typeof parsed.watermark?.opacity === 'number'
            ? clampOpacity(parsed.watermark.opacity)
            : DEFAULT_PREFS.watermark.opacity,
      },
    }
  } catch {
    return DEFAULT_PREFS
  }
}

type RedactionPrefsContextValue = RedactionPrefs & {
  setFillColor: (color: string) => void
  setWatermarkEnabled: (enabled: boolean) => void
  setWatermarkText: (text: string) => void
  setWatermarkOpacity: (opacity: number) => void
}

const RedactionPrefsContext = createContext<RedactionPrefsContextValue | null>(null)

export function RedactionPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<RedactionPrefs>(readStoredPrefs)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  const setFillColor = useCallback((color: string) => {
    setPrefs((p) => ({ ...p, fillColor: normalizeHex(color) }))
  }, [])

  const setWatermarkEnabled = useCallback((enabled: boolean) => {
    setPrefs((p) => ({ ...p, watermark: { ...p.watermark, enabled } }))
  }, [])

  const setWatermarkText = useCallback((text: string) => {
    setPrefs((p) => ({
      ...p,
      watermark: { ...p.watermark, text: text.trim().slice(0, 80) || DEFAULT_PREFS.watermark.text },
    }))
  }, [])

  const setWatermarkOpacity = useCallback((opacity: number) => {
    setPrefs((p) => ({
      ...p,
      watermark: { ...p.watermark, opacity: clampOpacity(opacity) },
    }))
  }, [])

  const value = useMemo(
    () => ({
      ...prefs,
      setFillColor,
      setWatermarkEnabled,
      setWatermarkText,
      setWatermarkOpacity,
    }),
    [prefs, setFillColor, setWatermarkEnabled, setWatermarkText, setWatermarkOpacity],
  )

  return (
    <RedactionPrefsContext.Provider value={value}>{children}</RedactionPrefsContext.Provider>
  )
}

export function useRedactionPrefs() {
  const ctx = useContext(RedactionPrefsContext)
  if (!ctx) throw new Error('useRedactionPrefs must be used within RedactionPrefsProvider')
  return ctx
}
