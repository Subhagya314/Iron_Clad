import { useMutation, useQuery } from 'convex/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { AppShell } from './components/layout/AppShell'
import { AnnotationsRightPanel } from './components/layout/panels/AnnotationsRightPanel'
import { BatchRightPanel } from './components/layout/panels/BatchRightPanel'
import { ConflictsRightPanel } from './components/layout/panels/ConflictsRightPanel'
import { DashboardRightPanel } from './components/layout/panels/DashboardRightPanel'
import { SimpleRightPanel } from './components/layout/panels/SimpleRightPanel'
import { WorkspaceRightPanel } from './components/layout/panels/WorkspaceRightPanel'
import type { OverlayBox } from './components/pdf-viewer/RedactionOverlay'
import { getStoredActiveGroupId, setStoredActiveGroupId } from './lib/activeGroupId'
import { isConvexConfigured } from './lib/convexClient'
import { useDocumentUpload } from './lib/hooks/useDocumentUpload'
import { usePresenceHeartbeat } from './lib/hooks/usePresenceHeartbeat'
import { exportRedactedPdf } from './lib/pdf/exportRedactedPdf'
import {
  getStoredUserEmail,
  setStoredUserEmail,
} from './lib/userEmail'
import type { AppRoute } from './navigation/routes'
import { AnnotationsPage } from './pages/AnnotationsPage'
import { BatchPage } from './pages/BatchPage'
import { ConflictsPage } from './pages/ConflictsPage'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage } from './pages/SettingsPage'
import { TeamsPage } from './pages/TeamsPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { toRedactionExportBox } from './types/redaction'

const DEMO_PDF =
  'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'

function EmailGate() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <p className="max-w-sm text-center text-sm text-zinc-600">
        Enter your work email to use Iron Clad. No password — we only store this to label your edits
        (not verified).
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
  const userEmail = getStoredUserEmail()!
  const [route, setRoute] = useState<AppRoute>('workspace')
  const [localPdfUrl, setLocalPdfUrl] = useState<string | undefined>(undefined)
  const [documentId, setDocumentId] = useState<Id<'documents'> | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => getStoredActiveGroupId())
  const [newGroupName, setNewGroupName] = useState('')
  const [addMemberEmail, setAddMemberEmail] = useState('')
  const [memberFeedback, setMemberFeedback] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const convexReady = isConvexConfigured()
  const gid = activeGroupId !== null ? (activeGroupId as Id<'groups'>) : undefined

  const myGroups = useQuery(api.groups.listMyGroups, convexReady ? { userEmail } : 'skip')
  const accessibleDocs = useQuery(api.documents.listAccessible, convexReady ? { userEmail } : 'skip')

  const selectedDoc = useQuery(
    api.documents.get,
    convexReady && documentId ? { documentId, userEmail } : 'skip',
  )
  const pdfStorageUrl = useQuery(
    api.documents.getFileUrl,
    convexReady && selectedDoc
      ? { storageId: selectedDoc.storageId, userEmail }
      : 'skip',
  )

  const rawBoxes = useQuery(
    api.redactions.listByDocument,
    convexReady && documentId ? { documentId, userEmail } : 'skip',
  )

  const presenceRows = useQuery(
    api.presence.listPresentInDocument,
    convexReady && documentId ? { documentId, userEmail } : 'skip',
  )

  const membersForActiveGroup = useQuery(
    api.groups.listMembers,
    convexReady && activeGroupId
      ? { groupId: activeGroupId as Id<'groups'>, userEmail }
      : 'skip',
  )

  const createGroup = useMutation(api.groups.create)
  const addMember = useMutation(api.groups.addMember)
  const removeMember = useMutation(api.groups.removeMember)
  const createBox = useMutation(api.redactions.createBox)
  const updateBox = useMutation(api.redactions.updateBox)
  const deleteBox = useMutation(api.redactions.deleteBox)

  const { uploadPdf, uploading, error: uploadError } = useDocumentUpload(userEmail, gid ?? null)

  usePresenceHeartbeat(userEmail, convexReady ? documentId : null)

  const overlayBoxes: OverlayBox[] = useMemo(
    () =>
      (rawBoxes ?? []).map((b) => ({
        id: b._id,
        pageNumber: b.pageNumber,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        status: b.status,
        userId: b.userId,
        exemptionShortCodeSnapshot: b.exemptionShortCodeSnapshot,
        exemptionTitleSnapshot: b.exemptionTitleSnapshot,
      })),
    [rawBoxes],
  )

  const pdfUrl =
    documentId && pdfStorageUrl !== undefined ? pdfStorageUrl ?? undefined : localPdfUrl

  const collaborators = useMemo(
    () =>
      (presenceRows ?? [])
        .filter((p) => p.userId !== userEmail)
        .map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          color: p.color,
        })),
    [presenceRows, userEmail],
  )

  const draftCount = overlayBoxes.filter((b) => b.status === 'draft').length
  const activeGroupMeta = myGroups?.find(({ group }) => group._id === activeGroupId)
  const isGroupAdmin = activeGroupMeta?.role === 'admin'

  const setGroupScope = useCallback((id: string | null) => {
    setActiveGroupId(id)
    setStoredActiveGroupId(id)
  }, [])

  const onAddDocument = () => fileInputRef.current?.click()

  const onFile = async (f: FileList | null) => {
    const file = f?.[0]
    if (!file) return

    if (!convexReady) {
      setLocalPdfUrl(URL.createObjectURL(file))
      setDocumentId(null)
      setRoute('workspace')
      return
    }

    const id = await uploadPdf(file)
    if (id) {
      setDocumentId(id)
      setLocalPdfUrl(undefined)
      setRoute('workspace')
    }
  }

  const selectConvexDoc = (id: Id<'documents'>) => {
    setDocumentId(id)
    setLocalPdfUrl(undefined)
    setRoute('workspace')
  }

  const onCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newGroupName.trim()
    if (!name || !convexReady) return
    await createGroup({ name, userEmail })
    setNewGroupName('')
  }

  const onAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeGroupId || !convexReady) return
    setMemberFeedback(null)
    try {
      await addMember({
        groupId: activeGroupId as Id<'groups'>,
        targetEmail: addMemberEmail.trim(),
        userEmail,
      })
      setAddMemberEmail('')
    } catch (err) {
      setMemberFeedback(err instanceof Error ? err.message : 'Failed')
    }
  }

  const onCreateBox = useCallback(
    async (
      pageNumber: number,
      rect: { x: number; y: number; width: number; height: number },
    ) => {
      if (!documentId || !convexReady) return
      await createBox({
        documentId,
        pageNumber,
        ...rect,
        userEmail,
        status: 'draft',
      })
    },
    [convexReady, createBox, documentId, userEmail],
  )

  const onLockBox = useCallback(
    async (boxId: string) => {
      await updateBox({
        boxId: boxId as Id<'redactionBoxes'>,
        userEmail,
        status: 'locked',
      })
    },
    [updateBox, userEmail],
  )

  const onDeleteBox = useCallback(
    async (boxId: string) => {
      await deleteBox({ boxId: boxId as Id<'redactionBoxes'>, userEmail })
    },
    [deleteBox, userEmail],
  )

  const onExport = async () => {
    if (!pdfUrl) return
    try {
      const bytes = await fetch(pdfUrl).then((r) => r.arrayBuffer())
      const byPage = new Map<number, ReturnType<typeof toRedactionExportBox>[]>()
      for (const box of overlayBoxes) {
        const list = byPage.get(box.pageNumber ?? 1) ?? []
        list.push(toRedactionExportBox(box))
        byPage.set(box.pageNumber ?? 1, list)
      }
      const pages = [...byPage.entries()].map(([pageNumber, boxes]) => ({
        pageIndex: pageNumber - 1,
        boxes,
      }))
      const out = await exportRedactedPdf(bytes, pages)
      const blob = new Blob([Uint8Array.from(out)], { type: 'application/pdf' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = selectedDoc?.name ? `redacted-${selectedDoc.name}` : 'redacted.pdf'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      console.error('Export failed', e)
    }
  }

  const uploadFailureNotice =
    uploadError !== null ? (
      <div className="mb-4 rounded border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container">
        {uploadError}
      </div>
    ) : null

  const rightPanel = useMemo(() => {
    switch (route) {
      case 'workspace':
        return (
          <WorkspaceRightPanel
            collaborators={collaborators}
            draftBoxes={overlayBoxes}
            onLockBox={convexReady ? onLockBox : undefined}
            onDeleteBox={convexReady ? onDeleteBox : undefined}
          />
        )
      case 'dashboard':
        return <DashboardRightPanel />
      case 'conflicts':
        return <ConflictsRightPanel />
      case 'annotations':
        return <AnnotationsRightPanel />
      case 'batch':
        return <BatchRightPanel />
      case 'team':
        return (
          <SimpleRightPanel
            title="Teams"
            description="Set where uploads go and invite colleagues. Presence for the open document stays in the Workspace panel."
          />
        )
      case 'archive':
        return (
          <SimpleRightPanel title="Archive" description="Closed cases and exported productions." />
        )
      case 'settings':
        return (
          <SimpleRightPanel
            title="Settings"
            description="Manage your session email and Convex connection in the main area."
          />
        )
      default:
        return null
    }
  }, [route, collaborators, overlayBoxes, convexReady, onLockBox, onDeleteBox])

  const mainContent = useMemo(() => {
    switch (route) {
      case 'workspace':
        return (
          <WorkspacePage
            pdfUrl={pdfUrl}
            boxes={overlayBoxes}
            onCreateBox={convexReady && documentId ? onCreateBox : undefined}
            emptyAction={
              <button
                type="button"
                className="rounded bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary"
                onClick={() => {
                  setLocalPdfUrl(DEMO_PDF)
                  setDocumentId(null)
                }}
              >
                Load sample PDF
              </button>
            }
          />
        )
      case 'dashboard':
        return <DashboardPage />
      case 'conflicts':
        return <ConflictsPage />
      case 'annotations':
        return <AnnotationsPage />
      case 'batch':
        return <BatchPage />
      case 'team':
        return (
          <TeamsPage
            convexReady={convexReady}
            userEmail={userEmail}
            myGroups={myGroups}
            activeGroupId={activeGroupId}
            onSelectScope={setGroupScope}
            newGroupName={newGroupName}
            onNewGroupNameChange={setNewGroupName}
            onCreateGroup={onCreateGroup}
            membersForActiveGroup={membersForActiveGroup}
            isGroupAdmin={isGroupAdmin}
            addMemberEmail={addMemberEmail}
            onAddMemberEmailChange={setAddMemberEmail}
            onAddMember={onAddMember}
            memberFeedback={memberFeedback}
            onRemoveMember={(targetEmail) => {
              if (!activeGroupId) return
              void removeMember({
                groupId: activeGroupId as Id<'groups'>,
                targetEmail,
                userEmail,
              })
            }}
          />
        )
      case 'archive':
        return (
          <PlaceholderPage
            title="Archive"
            description="Historical cases and finalized productions."
            icon="inventory_2"
          />
        )
      case 'settings':
        return <SettingsPage userEmail={userEmail} convexReady={convexReady} />
      default:
        return null
    }
  }, [
    route,
    pdfUrl,
    overlayBoxes,
    convexReady,
    documentId,
    onCreateBox,
    activeGroupId,
    myGroups,
    membersForActiveGroup,
    isGroupAdmin,
    userEmail,
    newGroupName,
    addMemberEmail,
    memberFeedback,
    onCreateGroup,
    onAddMember,
    removeMember,
    setGroupScope,
  ])

  return (
    <AppShell
      route={route}
      onNavigate={setRoute}
      rightPanel={rightPanel}
      documents={accessibleDocs}
      activeDocumentId={documentId}
      onSelectDocument={selectConvexDoc}
      onAddDocument={onAddDocument}
      uploading={uploading}
      draftCount={draftCount}
      onExportClick={onExport}
      mainNotice={uploadFailureNotice}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => void onFile(e.target.files)}
      />
      {mainContent}
    </AppShell>
  )
}

function App() {
  const hasEmail = typeof window !== 'undefined' && getStoredUserEmail() !== null
  return hasEmail ? <MainApp /> : <EmailGate />
}

export default App
