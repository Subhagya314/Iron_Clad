import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { PresenceBadge } from '../components/presence/PresenceBadge'
import { setStoredUserEmail, clearStoredUserEmail } from '../lib/userEmail'

type Props = {
  userEmail: string
  convexReady: boolean
}

export function SettingsPage({ userEmail, convexReady }: Props) {
  const [nextEmail, setNextEmail] = useState(userEmail)

  useEffect(() => setNextEmail(userEmail), [userEmail])

  const submitEmailChange = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nextEmail.trim().toLowerCase()
    if (!trimmed.includes('@')) return
    if (trimmed === userEmail) return
    setStoredUserEmail(trimmed)
    window.location.reload()
  }

  const onClearIdentity = () => {
    clearStoredUserEmail()
    window.location.reload()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Workspace preferences, identity, and connection to your backend.
        </p>
      </header>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
            <Icon name="badge" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-on-surface">Identity</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              No password—we keep this email only to attribute redactions on the server (not verified).
            </p>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-on-surface-variant">Current session</p>
            <code className="mt-1 block truncate rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm text-on-surface">
              {userEmail}
            </code>

            <form className="mt-6 flex flex-wrap items-end gap-3 border-t border-outline-variant pt-6" onSubmit={submitEmailChange}>
              <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-on-surface-variant">
                Change work email
                <input
                  type="email"
                  autoComplete="email"
                  value={nextEmail}
                  onChange={(e) => setNextEmail(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm text-on-surface"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg border border-outline-variant bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
              >
                Update email
              </button>
            </form>

            <div className="mt-6 border-t border-outline-variant pt-6">
              <button
                type="button"
                onClick={() => void onClearIdentity()}
                className="text-sm text-secondary underline-offset-4 hover:underline"
              >
                Clear saved email & sign out of this workspace
              </button>
              <p className="mt-1 text-xs text-on-surface-variant">
                Same as before: you&apos;ll enter your email again on the next screen.
              </p>
            </div>
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
              Teams, documents, and redactions sync through Convex when a deployment URL is configured.
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
    </div>
  )
}
