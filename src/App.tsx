import { useRef, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { PdfViewer } from './components/pdf-viewer/PdfViewer'
import { CollaboratorList } from './components/presence/CollaboratorList'
import { PresenceBadge } from './components/presence/PresenceBadge'
import { isConvexConfigured } from './lib/convexClient'
import {
  clearStoredUserEmail,
  getStoredUserEmail,
  setStoredUserEmail,
} from './lib/userEmail'

const DEMO_PDF =
  'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'

function EmailGate() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <p className="max-w-sm text-center text-sm text-zinc-600">
        Enter your work email to use Iron Clad. No password — we only store this to label your
        edits (not verified).
      </p>
      <form
        className="flex w-full max-w-sm flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = email.trim().toLowerCase()
          if (!trimmed.includes('@')) {
            setError('Enter a valid email address.')
            return
          }
          setError(null)
          setStoredUserEmail(trimmed)
          window.location.reload()
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@firm.com"
            className="rounded-md border border-zinc-300 px-3 py-2 font-normal"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Continue
        </button>
      </form>
      {!isConvexConfigured() && (
        <p className="max-w-md text-center text-xs text-amber-800">
          Set <code className="rounded bg-amber-50 px-1">VITE_CONVEX_URL</code> in{' '}
          <code className="rounded bg-amber-50 px-1">.env.local</code> and run{' '}
          <code className="rounded bg-amber-50 px-1">npx convex dev</code>.
        </p>
      )}
    </div>
  )
}

function MainApp() {
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const convexReady = isConvexConfigured()
  const userEmail = getStoredUserEmail()!

  const onUploadClick = () => fileInputRef.current?.click()

  const onFile = (f: FileList | null) => {
    const file = f?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPdfUrl(url)
  }

  const onExportClick = () => {
    console.info('Export redacted PDF — implement in Phase 4')
  }

  return (
    <AppShell onUploadClick={onUploadClick} onExportClick={onExportClick}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => onFile(e.target.files)}
      />

      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <PresenceBadge label={convexReady ? 'Convex URL set' : 'Set VITE_CONVEX_URL'} />
          <span className="text-xs text-zinc-500">
            Editing as{' '}
            <code className="rounded bg-zinc-100 px-1 py-0.5">{userEmail}</code>
          </span>
          <button
            type="button"
            className="text-sm text-zinc-600 underline-offset-2 hover:underline"
            onClick={() => {
              clearStoredUserEmail()
              window.location.reload()
            }}
          >
            Change email
          </button>
        </div>
        {!convexReady && (
          <p className="mt-2 text-sm text-amber-800">
            Run <code className="rounded bg-amber-50 px-1">npx convex dev</code>, then add{' '}
            <code className="rounded bg-amber-50 px-1">VITE_CONVEX_URL</code> to{' '}
            <code className="rounded bg-amber-50 px-1">.env.local</code>.
          </p>
        )}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_220px]">
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-800">Document</h2>
            <button
              type="button"
              className="text-sm text-blue-600 underline-offset-2 hover:underline"
              onClick={() => setPdfUrl(DEMO_PDF)}
            >
              Load sample PDF
            </button>
          </div>
          <PdfViewer pdfUrl={pdfUrl} />
          {!pdfUrl && (
            <p className="mt-4 text-sm text-zinc-500">
              Upload a PDF or load the sample to exercise PDF.js rendering.
            </p>
          )}
        </section>
        <aside className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-zinc-800">Here now</h2>
          <CollaboratorList collaborators={[]} />
        </aside>
      </div>
    </AppShell>
  )
}

function App() {
  const hasEmail = typeof window !== 'undefined' && getStoredUserEmail() !== null

  return hasEmail ? <MainApp /> : <EmailGate />
}

export default App
