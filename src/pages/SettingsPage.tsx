import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { PresenceBadge } from '../components/presence/PresenceBadge'
import { api } from '../../convex/_generated/api'
import { isConvexConfigured } from '../lib/convexClient'
import { clearStoredSessionToken } from '../lib/sessionToken'
import type { ThemePreference } from '../lib/theme'
import { useRedactionPrefs } from '../lib/redactionPrefs'
import { useTheme } from '../lib/theme'

type Props = {
  userEmail: string
  displayName: string | null
  sessionExpiresAt: number
  sessionToken: string
}

function initialsPreview(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '—'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]![0]
    const b = parts[parts.length - 1]![0]
    if (a && b) return (a + b).toUpperCase()
  }
  const alnum = trimmed.replace(/[^a-zA-Z0-9]/g, '')
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase()
  if (alnum.length === 1) return (alnum + alnum).toUpperCase()
  return trimmed.slice(0, 2).toUpperCase()
}

export function SettingsPage({
  userEmail,
  displayName,
  sessionExpiresAt,
  sessionToken,
}: Props) {
  const convexReady = isConvexConfigured()
  const revokeSession = useMutation(api.session.revokeSession)
  const setDisplayNameMutation = useMutation(api.session.setDisplayName)
  const exemptionCodes = useQuery(api.exemptionCodes.list, convexReady ? {} : 'skip')
  const seedDefaults = useMutation(api.exemptionCodes.seedDefaults)
  const { preference, setPreference, isDark } = useTheme()
  const {
    fillColor,
    watermark,
    setWatermarkEnabled,
    setWatermarkText,
    setWatermarkOpacity,
  } = useRedactionPrefs()

  const [nameDraft, setNameDraft] = useState(displayName ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  useEffect(() => {
    setNameDraft(displayName ?? '')
  }, [displayName])

  const onSignOut = async () => {
    try {
      await revokeSession({ sessionToken })
    } catch {
      /* still clear local token */
    }
    clearStoredSessionToken()
    window.location.reload()
  }

  const onSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveState('saving')
    try {
      await setDisplayNameMutation({ sessionToken, displayName: nameDraft })
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  const onCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(userEmail)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      /* ignore */
    }
  }

  const expiresLabel = new Date(sessionExpiresAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const themeChoices: { id: ThemePreference; label: string; hint: string }[] = [
    { id: 'system', label: 'System', hint: 'Match the device' },
    { id: 'light', label: 'Light', hint: 'Always light' },
    { id: 'dark', label: 'Dark', hint: 'Always dark' },
  ]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-on-surface">Profile and settings</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          How you appear in the workspace, appearance, and your session.
        </p>
      </header>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
            <span
              className="flex size-20 items-center justify-center rounded-full border-2 border-outline-variant bg-secondary-container text-lg font-bold text-on-secondary-container"
              aria-hidden
            >
              {initialsPreview(nameDraft || userEmail)}
            </span>
            <p className="text-center text-[10px] uppercase tracking-wider text-on-surface-variant sm:text-left">
              Preview
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container max-sm:hidden">
                <Icon name="badge" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-on-surface">Profile</h2>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  This name appears in the header, sidebar, and when collaborators see you in a document.
                </p>

                <form onSubmit={(e) => void onSaveName(e)} className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium text-on-surface-variant">Display name</span>
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={64}
                      placeholder={userEmail.split('@')[0] ?? 'Your name'}
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline focus:outline-2 focus:outline-secondary"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      disabled={saveState === 'saving'}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-60"
                    >
                      {saveState === 'saving' ? 'Saving…' : 'Save name'}
                    </button>
                    {saveState === 'saved' ? (
                      <span className="text-xs font-medium text-secondary">Saved</span>
                    ) : null}
                    {saveState === 'error' ? (
                      <span className="text-xs font-medium text-error">Could not save. Try again.</span>
                    ) : null}
                    <p className="w-full text-xs text-on-surface-variant">
                      Leave blank to fall back to your email prefix everywhere.
                    </p>
                  </div>
                </form>

                <p className="mt-6 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Email
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm text-on-surface">
                    {userEmail}
                  </code>
                  <button
                    type="button"
                    onClick={() => void onCopyEmail()}
                    className="shrink-0 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                  >
                    {copyState === 'copied' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tertiary-container text-on-tertiary-container">
            <Icon name={isDark ? 'dark_mode' : 'light_mode'} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-on-surface">Appearance</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Theme applies everywhere in this app. The sidebar footer still toggles light and dark quickly.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {themeChoices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPreference(c.id)}
                  className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                    preference === c.id
                      ? 'border-secondary bg-secondary-container font-semibold text-on-secondary-container'
                      : 'border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="block text-sm">{c.label}</span>
                  <span className="mt-0.5 block text-[11px] text-on-surface-variant">{c.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-on-surface-variant">
              Current look: <span className="font-medium text-on-surface">{isDark ? 'Dark' : 'Light'}</span>
              {preference === 'system' ? ' (from your device)' : ''}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
            <Icon name="ink_eraser" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-on-surface">Redaction &amp; export</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Pick fill color in the workspace toolbar. Watermark is stamped on every exported page.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-xs text-on-surface-variant">Current fill</span>
              <span
                className="inline-block size-8 rounded border border-outline-variant"
                style={{ backgroundColor: fillColor }}
                title={fillColor}
              />
              <code className="text-xs text-on-surface">{fillColor}</code>
            </div>
            <div className="mt-6 space-y-4 border-t border-outline-variant pt-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={watermark.enabled}
                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                  className="size-4 rounded border-outline-variant"
                />
                Add watermark on export
              </label>
              <label className="block text-sm text-on-surface">
                <span className="text-xs font-medium text-on-surface-variant">Watermark text</span>
                <input
                  type="text"
                  value={watermark.text}
                  disabled={!watermark.enabled}
                  maxLength={80}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="CONFIDENTIAL"
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm disabled:opacity-50"
                />
              </label>
              <label className="block text-sm text-on-surface">
                <span className="text-xs font-medium text-on-surface-variant">
                  Opacity ({Math.round(watermark.opacity * 100)}%)
                </span>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={Math.round(watermark.opacity * 100)}
                  disabled={!watermark.enabled}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value) / 100)}
                  className="mt-2 w-full disabled:opacity-50"
                />
              </label>
              <p className="text-[11px] text-on-surface-variant">
                Enable to preview the watermark in the workspace. Boxes extend 5% below your selection
                for safer coverage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tertiary-container text-on-tertiary-container">
            <Icon name="gavel" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-on-surface">Redaction reasons</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              FOIA exemptions and privilege codes available in the workspace Reason dropdown.
            </p>
            {convexReady && (
              <>
                <p className="mt-3 text-xs text-on-surface-variant">
                  {exemptionCodes === undefined
                    ? 'Loading…'
                    : `${exemptionCodes.length} active reason${exemptionCodes.length === 1 ? '' : 's'}`}
                </p>
                <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-outline-variant bg-background p-2 text-xs">
                  {exemptionCodes?.length === 0 && (
                    <li className="text-on-surface-variant">No reasons yet — load the standard set below.</li>
                  )}
                  {exemptionCodes?.map((code) => (
                    <li key={code._id} className="truncate text-on-surface">
                      <span className="font-semibold">{code.shortCode}</span> — {code.title}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={!convexReady}
                  onClick={() => void seedDefaults({})}
                  className="mt-4 rounded-lg border border-outline-variant bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary hover:opacity-90 disabled:opacity-50"
                >
                  Load standard reasons
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            <Icon name="cloud_done" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-on-surface">Backend (Convex)</h2>
            <p className="mt-2 text-xs text-on-surface-variant">
              Sessions, documents, teams, and redactions are stored here.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PresenceBadge label={convexReady ? 'Convex URL configured' : 'Convex URL missing'} />
            </div>
            {!convexReady && (
              <p className="mt-4 text-xs text-secondary">
                Set <code className="rounded bg-surface-container-high px-1 py-0.5">VITE_CONVEX_URL</code> in{' '}
                <code className="rounded bg-surface-container-high px-1 py-0.5">.env.local</code> and run{' '}
                <code className="rounded bg-surface-container-high px-1 py-0.5">npx convex dev</code>.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
            <Icon name="lock" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-on-surface">Session</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              This device stays signed in until the session expires or you sign out.
            </p>
            <p className="mt-4 text-xs text-on-surface">
              <span className="font-medium text-on-surface-variant">Valid until:</span> {expiresLabel}
            </p>
            <div className="mt-6 border-t border-outline-variant pt-6">
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="rounded-lg border border-outline-variant bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
              >
                Sign out on this device
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
