import { useConvex, useMutation, useQuery } from 'convex/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { IronCladLogo } from './components/branding/IronCladLogo'
import { EmailGate } from './components/auth/EmailGate'
import { AppShell } from './components/layout/AppShell'
import { SimpleRightPanel } from './components/layout/panels/SimpleRightPanel'
import { WorkspaceRightPanel, type WorkspaceAllocation } from './components/layout/panels/WorkspaceRightPanel'
import type { OverlayBox } from './components/pdf-viewer/RedactionOverlay'
import { clearStoredSessionToken, getStoredSessionToken } from './lib/sessionToken'
import { isConvexConfigured } from './lib/convexClient'
import { enhanceConvexActionError } from './lib/convexErrors'
import { useDocumentUpload } from './lib/hooks/useDocumentUpload'
import { usePresenceHeartbeat } from './lib/hooks/usePresenceHeartbeat'
import { exportReleaseRedactedPdf } from './lib/pdf/exportReleasePdf'
import { useRedactionPrefs } from './lib/redactionPrefs'
import type { AppRoute } from './navigation/routes'
import { AnnotationsPage } from './pages/AnnotationsPage'
import { BatchPage } from './pages/BatchPage'
import { ConflictsPage } from './pages/ConflictsPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import type { TeamsWithCasesPayload } from './pages/TeamsPage'
import { TeamsPage } from './pages/TeamsPage'
import { CasesPage, type CreateCasePayload } from './pages/CasesPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { toRedactionExportBox } from './types/redaction'

const DEMO_PDF =
  'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'

function initialsFromEmail(email: string): string {
  const local = (email.split('@')[0] ?? email).replace(/[^a-zA-Z0-9]/g, '')
  if (local.length >= 2) return local.slice(0, 2).toUpperCase()
  const alnum = email.replace(/[^a-zA-Z0-9]/g, '')
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase()
  const first = email[0]
  return first ? first.toUpperCase() : '?'
}

function initialsFromDisplayOrEmail(displayName: string | null | undefined, email: string): string {
  const name = displayName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = parts[0]![0]
      const b = parts[parts.length - 1]![0]
      if (a && b) return (a + b).toUpperCase()
    }
    const alnum = name.replace(/[^a-zA-Z0-9]/g, '')
    if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase()
    if (alnum.length === 1) return (alnum + alnum).toUpperCase()
  }
  return initialsFromEmail(email)
}

type SessionPayload = {
  email: string
  displayName: string | null
  preferredUploadCaseId: Id<'cases'> | null
  expiresAt: number
}

function AuthenticatedApp({ sessionToken }: { sessionToken: string }) {
  const session = useQuery(api.session.getSession, { sessionToken })

  if (session === undefined) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-sm text-on-surface-variant">
        <IronCladLogo imgClassName="max-h-[52px]" />
        Loading session…
      </div>
    )
  }

  if (session === null) {
    clearStoredSessionToken()
    return <EmailGate />
  }

  return <MainApp sessionToken={sessionToken} session={session} />
}

function MainApp({
  sessionToken,
  session,
}: {
  sessionToken: string
  session: SessionPayload
}) {
  const convex = useConvex()
  const userEmail = session.email
  const displayName = session.displayName
  const activeCaseId = session.preferredUploadCaseId

  const [route, setRoute] = useState<AppRoute>('workspace')
  const [localPdfUrl, setLocalPdfUrl] = useState<string | undefined>(undefined)
  const [documentId, setDocumentId] = useState<Id<'documents'> | null>(null)
  const [newCollaborativeTeamName, setNewCollaborativeTeamName] = useState('')
  const [addMemberEmail, setAddMemberEmail] = useState('')
  const [memberFeedback, setMemberFeedback] = useState<string | null>(null)

  const [caseWizardNonce, setCaseWizardNonce] = useState(0)
  const [caseWizardHandledNonce, setCaseWizardHandledNonce] = useState(0)
  const { fillColor, watermark } = useRedactionPrefs()

  const [bulkSidebarNotice, setBulkSidebarNotice] = useState<string | null>(null)
  const [bulkSidebarBusy, setBulkSidebarBusy] = useState(false)

  const thumbnailsInputRef = useRef<HTMLInputElement>(null)
  const convexReady = isConvexConfigured()

  const bootstrapPreferredCase = useMutation(api.session.bootstrapPreferredCaseIfNeeded)
  useEffect(() => {
    if (!convexReady || activeCaseId !== null) return
    void bootstrapPreferredCase({ sessionToken }).catch(() => {})
  }, [bootstrapPreferredCase, convexReady, activeCaseId, sessionToken])

  const teamsWithCases = useQuery(api.teams.listTeamsWithCases, convexReady ? { sessionToken } : 'skip')

  useEffect(() => {
    if (!convexReady || teamsWithCases === undefined || teamsWithCases.length > 0) return
    void bootstrapPreferredCase({ sessionToken }).catch(() => {})
  }, [bootstrapPreferredCase, convexReady, sessionToken, teamsWithCases])
  const teamsPayload: TeamsWithCasesPayload[] = useMemo(
    () => teamsWithCases ?? [],
    [teamsWithCases],
  )

  const accessibleDocs = useQuery(api.documents.listAccessible, convexReady ? { sessionToken } : 'skip')

  const selectedDoc = useQuery(
    api.documents.get,
    convexReady && documentId ? { documentId, sessionToken } : 'skip',
  )
  const pdfStorageUrl = useQuery(
    api.documents.getFileUrl,
    convexReady && selectedDoc ? { storageId: selectedDoc.storageId, sessionToken } : 'skip',
  )

  const rawBoxes = useQuery(
    api.redactions.listByDocument,
    convexReady && documentId ? { documentId, sessionToken } : 'skip',
  )

  const presenceRows = useQuery(
    api.presence.listPresentInDocument,
    convexReady && documentId ? { documentId, sessionToken } : 'skip',
  )

  const contextCaseId = useMemo(
    () => selectedDoc?.caseId ?? activeCaseId ?? null,
    [selectedDoc?.caseId, activeCaseId],
  )

  const contextCaseBundle = useMemo(() => {
    if (!contextCaseId || !teamsWithCases?.length) return null
    for (const tw of teamsWithCases) {
      const hit = tw.cases.find(({ case: c }) => c._id === contextCaseId)
      if (hit) return { tw, caseDoc: hit.case }
    }
    return null
  }, [contextCaseId, teamsWithCases])

  const contextCaseTeamId = contextCaseBundle?.tw.team._id ?? null

  const membersForEditorsTeam = useQuery(
    api.teams.listMembers,
    convexReady && contextCaseTeamId ? { teamId: contextCaseTeamId, sessionToken } : 'skip',
  )

  const activeTeamIdForMembers = useMemo(() => {
    if (!activeCaseId || !teamsWithCases?.length) return null
    for (const tw of teamsWithCases) {
      if (tw.cases.some(({ case: c }) => c._id === activeCaseId && tw.team.kind === 'collab')) {
        return tw.team._id
      }
    }
    return null
  }, [activeCaseId, teamsWithCases])

  const membersForActiveTeam = useQuery(
    api.teams.listMembers,
    convexReady && activeTeamIdForMembers ? { teamId: activeTeamIdForMembers, sessionToken } : 'skip',
  )

  const setPreferredUploadCase = useMutation(api.session.setPreferredUploadCase)

  const createCollaborativeTeam = useMutation(api.teams.createCollaborative)
  const createAdditionalCase = useMutation(api.cases.create)
  const addMember = useMutation(api.teams.addMember)
  const removeMember = useMutation(api.teams.removeMember)
  const createBox = useMutation(api.redactions.createBox)
  const updateBox = useMutation(api.redactions.updateBox)
  const deleteBox = useMutation(api.redactions.deleteBox)
  const renameDocument = useMutation(api.documents.rename)
  const removeDocument = useMutation(api.documents.removeDocument)
  const deleteMatterMutation = useMutation(api.cases.deleteCaseAndDocuments)
  const deleteTeamMutation = useMutation(api.teams.deleteCollaborativeTeam)

  const { uploadPdf, error: uploadError } = useDocumentUpload(
    sessionToken,
    activeCaseId ?? undefined,
  )

  usePresenceHeartbeat(
    convexReady ? sessionToken : null,
    convexReady ? documentId : null,
    displayName?.trim() || undefined,
  )

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
        exemptionCodeId: b.exemptionCodeId,
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

  const activeCaseMeta = useMemo(() => {
    if (!activeCaseId || !teamsWithCases) return null
    for (const tw of teamsWithCases) {
      const hit = tw.cases.find(({ case: c }) => c._id === activeCaseId)
      if (hit) return { ...tw, caseDoc: hit.case }
    }
    return null
  }, [activeCaseId, teamsWithCases])

  const activeTeamMembership = activeCaseMeta?.role ?? null
  const isTeamAdmin =
    Boolean(activeTeamIdForMembers) && Boolean(activeTeamMembership === 'admin')

  const setCaseScope = useCallback(
    async (caseId: Id<'cases'> | string) => {
      await setPreferredUploadCase({
        sessionToken,
        caseId: caseId as Id<'cases'>,
      })
    },
    [sessionToken, setPreferredUploadCase],
  )

  useEffect(() => {
    if (!convexReady || teamsWithCases === undefined || activeCaseId === null) return
    const ok = teamsWithCases.some((tw) => tw.cases.some(({ case: c }) => c._id === activeCaseId))
    if (!ok) void bootstrapPreferredCase({ sessionToken })
  }, [convexReady, teamsWithCases, activeCaseId, bootstrapPreferredCase, sessionToken])

  const workspaceAllocation = useMemo((): WorkspaceAllocation => {
    if (!convexReady || activeCaseId === null) return { kind: 'loading' }
    if (contextCaseBundle === null || membersForEditorsTeam === undefined) return { kind: 'loading' }
    return {
      kind: 'ready',
      context: {
        label: 'Matter',
        name: contextCaseBundle.caseDoc.name,
        sourceTeamName:
          contextCaseBundle.tw.team.kind === 'collab' ? contextCaseBundle.tw.team.name : undefined,
      },
      editors: membersForEditorsTeam.map((m) => ({ userId: m.userId, role: m.role })),
    }
  }, [activeCaseId, contextCaseBundle, convexReady, membersForEditorsTeam])

  const onSidebarBulkPdfFiles = async (f: FileList | null, inputReset: () => void) => {
    const list = f ? Array.from(f) : []
    if (!list.length || !convexReady || activeCaseId === null) {
      inputReset()
      return
    }

    let failed = 0
    let firstNew: Id<'documents'> | null = null

    setBulkSidebarBusy(true)
    setBulkSidebarNotice(null)
    try {
      for (const file of list) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) continue
        const id = await uploadPdf(file, activeCaseId, { quiet: true })
        if (!id) failed += 1
        else if (!firstNew) firstNew = id
      }

      setBulkSidebarNotice(
        failed ? `${failed} file(s) failed to upload. Check your Convex connection.` : null,
      )

      if (firstNew) {
        setDocumentId(firstNew)
        setLocalPdfUrl(undefined)
        setRoute('workspace')
      }
    } finally {
      setBulkSidebarBusy(false)
      inputReset()
    }
  }

  const selectConvexDoc = useCallback(
    async (id: Id<'documents'>) => {
      const row = accessibleDocs?.find((d) => d._id === id)
      if (row?.caseId) await setCaseScope(row.caseId)
      setDocumentId(id)
      setLocalPdfUrl(undefined)
      setRoute('workspace')
    },
    [accessibleDocs, setCaseScope],
  )

  const openCaseWorkspace = useCallback(
    async (caseRowId: Id<'cases'>) => {
      await setCaseScope(caseRowId)
      setRoute('workspace')
    },
    [setCaseScope],
  )

  const onDeleteCaseMatter = useCallback(
    async (caseToDeleteId: Id<'cases'>) => {
      if (!convexReady) return
      await deleteMatterMutation({ caseId: caseToDeleteId, sessionToken })
      if (activeCaseId === caseToDeleteId) {
        try {
          const r = await bootstrapPreferredCase({ sessionToken })
          if (r.preferredUploadCaseId) await setCaseScope(r.preferredUploadCaseId)
        } catch {
          /* ignore */
        }
        setDocumentId(null)
        setLocalPdfUrl(undefined)
      }
    },
    [
      activeCaseId,
      bootstrapPreferredCase,
      convexReady,
      deleteMatterMutation,
      sessionToken,
      setCaseScope,
    ],
  )

  const onDeleteCollaborativeTeam = useCallback(
    async (teamIdToDelete: Id<'teams'>) => {
      if (!convexReady) return
      await deleteTeamMutation({ teamId: teamIdToDelete, sessionToken })
      try {
        const r = await bootstrapPreferredCase({ sessionToken })
        if (r.preferredUploadCaseId) await setCaseScope(r.preferredUploadCaseId)
      } catch {
        /* ignore */
      }
      if (
        teamsWithCases?.some(
          (tw) =>
            tw.team._id === teamIdToDelete &&
            tw.cases.some(({ case: c }) => c._id === activeCaseId),
        )
      ) {
        setDocumentId(null)
        setLocalPdfUrl(undefined)
      }
    },
    [
      activeCaseId,
      convexReady,
      deleteTeamMutation,
      sessionToken,
      bootstrapPreferredCase,
      setCaseScope,
      teamsWithCases,
    ],
  )

  const createCaseWithDetails = useCallback(
    async (payload: CreateCasePayload) => {
      if (!convexReady) {
        throw new Error(
          'Convex is not configured in this build (VITE_CONVEX_URL is empty). Add your Convex HTTPS URL under Environment Variables on Vercel, redeploy, then try again.',
        )
      }

      try {
        const trimmed = payload.matterName.trim()
        if (!trimmed) return

        const teamIdNew = await createCollaborativeTeam({ name: trimmed, sessionToken })
        const matterCaseId = await createAdditionalCase({
          teamId: teamIdNew,
          name: trimmed,
          sessionToken,
        })

        await setCaseScope(matterCaseId)

        const invite = new Set<string>()
        const selfLower = session.email.trim().toLowerCase()
        for (const raw of payload.memberEmails) {
          const t = raw.trim().toLowerCase()
          if (t.includes('@')) invite.add(t)
        }
        if (payload.importMembersFromTeamId) {
          const roster = await convex.query(api.teams.listMembers, {
            teamId: payload.importMembersFromTeamId,
            sessionToken,
          })
          for (const m of roster) {
            const e = String(m.userId).trim().toLowerCase()
            if (e && e.includes('@') && e !== selfLower) invite.add(e)
          }
        }

        for (const target of invite) {
          await addMember({ teamId: teamIdNew, targetEmail: target, sessionToken })
        }

        let failedPdf = 0
        let firstUploaded: Id<'documents'> | null = null

        if (payload.pdfFiles.length) {
          for (const file of payload.pdfFiles) {
            const pid = await uploadPdf(file, matterCaseId, { quiet: true })
            if (!pid) failedPdf += 1
            else if (!firstUploaded) firstUploaded = pid
          }
        }

        if (failedPdf > 0) {
          window.alert(`${failedPdf} PDF(s) failed to attach. Others may have succeeded—check the sidebar.`)
        }

        if (firstUploaded) {
          setDocumentId(firstUploaded)
          setLocalPdfUrl(undefined)
        }
        setRoute('workspace')
      } catch (e) {
        throw enhanceConvexActionError(e, 'Could not finish creating this case')
      }
    },
    [
      addMember,
      convex,
      convexReady,
      createAdditionalCase,
      createCollaborativeTeam,
      session.email,
      sessionToken,
      setCaseScope,
      uploadPdf,
    ],
  )

  const workspaceTitle = activeCaseMeta
    ? `${activeCaseMeta.team.name === 'Personal workspace' && activeCaseMeta.team.kind === 'solo' ? 'Personal' : activeCaseMeta.team.name} › ${activeCaseMeta.caseDoc.name}`
    : 'Case workspace'

  const thumbnailsScopeUi = useMemo(() => {
    if (!activeCaseMeta) {
      return {
        pdfSectionTitle: 'Matter PDFs',
        scopeKindLabel: 'Matter',
        allocatedTeamName: null as string | null,
      }
    }
    return {
      pdfSectionTitle: 'Matter PDFs',
      scopeKindLabel: 'Matter',
      allocatedTeamName: activeCaseMeta.team.kind === 'collab' ? activeCaseMeta.team.name : null,
    }
  }, [activeCaseMeta])

  const sidebarDocuments = useMemo(() => {
    if (!convexReady || activeCaseId === null) return undefined
    if (!accessibleDocs) return undefined
    return accessibleDocs
      .filter((d) => d.caseId === activeCaseId)
      .map((d) => ({ _id: d._id, name: d.name, createdAt: d.createdAt }))
  }, [accessibleDocs, activeCaseId, convexReady])

  const thumbnailsCasePanelActive = Boolean(convexReady && activeCaseId !== null)

  const onRenameDocument = useCallback(
    async (id: Id<'documents'>, name: string) => {
      if (!convexReady) return
      await renameDocument({ documentId: id, sessionToken, name })
    },
    [convexReady, renameDocument, sessionToken],
  )

  const onDeleteDocument = useCallback(
    async (id: Id<'documents'>) => {
      if (!convexReady) return
      await removeDocument({ documentId: id, sessionToken })
      if (documentId === id) {
        setDocumentId(null)
        setLocalPdfUrl(undefined)
      }
    },
    [convexReady, documentId, removeDocument, sessionToken],
  )

  const onCreateCollaborativeTeamSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const name = newCollaborativeTeamName.trim()
    if (!name || !convexReady) return
    const teamIdRes = await createCollaborativeTeam({ name, sessionToken })
    const refreshed = await convex.query(api.teams.listTeamsWithCases, { sessionToken })
    const bundle = refreshed.find((t) => t.team._id === teamIdRes)
    const defCase = bundle?.cases.find(({ case: c }) => c.isDefault)?.case._id
    if (defCase) await setCaseScope(defCase)
    setNewCollaborativeTeamName('')
  }

  const onAddMember = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeTeamIdForMembers || !convexReady) return
    setMemberFeedback(null)
    try {
      await addMember({
        teamId: activeTeamIdForMembers,
        targetEmail: addMemberEmail.trim(),
        sessionToken,
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
        sessionToken,
        status: 'draft',
      })
    },
    [convexReady, createBox, documentId, sessionToken],
  )

  const onLockBox = useCallback(
    async (boxId: string) => {
      await updateBox({
        boxId: boxId as Id<'redactionBoxes'>,
        sessionToken,
        status: 'locked',
      })
    },
    [updateBox, sessionToken],
  )

  const onDeleteBox = useCallback(
    async (boxId: string) => {
      await deleteBox({ boxId: boxId as Id<'redactionBoxes'>, sessionToken })
    },
    [deleteBox, sessionToken],
  )

  const onMoveBox = useCallback(
    async (boxId: string, rect: { x: number; y: number; width: number; height: number }) => {
      if (!convexReady) return
      await updateBox({
        boxId: boxId as Id<'redactionBoxes'>,
        sessionToken,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })
    },
    [convexReady, updateBox, sessionToken],
  )

  const onUpdateExemption = useCallback(
    async (boxId: string, exemptionCodeId: string | null) => {
      if (!convexReady) return
      if (exemptionCodeId === null) {
        await updateBox({
          boxId: boxId as Id<'redactionBoxes'>,
          sessionToken,
          clearExemption: true,
        })
      } else {
        await updateBox({
          boxId: boxId as Id<'redactionBoxes'>,
          sessionToken,
          exemptionCodeId: exemptionCodeId as Id<'exemptionCodes'>,
        })
      }
    },
    [convexReady, updateBox, sessionToken],
  )

  const buildExportPages = useCallback(() => {
    const byPage = new Map<number, ReturnType<typeof toRedactionExportBox>[]>()
    for (const box of overlayBoxes) {
      const list = byPage.get(box.pageNumber ?? 1) ?? []
      list.push(toRedactionExportBox(box))
      byPage.set(box.pageNumber ?? 1, list)
    }
    return [...byPage.entries()].map(([pageNumber, boxes]) => ({
      pageIndex: pageNumber - 1,
      boxes,
    }))
  }, [overlayBoxes])

  const onExport = useCallback(async () => {
    if (!pdfUrl) return
    const pages = buildExportPages()
    if (pages.every((p) => p.boxes.length === 0)) {
      window.alert('Add at least one redaction box before exporting.')
      return
    }
    try {
      const bytes = await fetch(pdfUrl).then((r) => r.arrayBuffer())
      const out = await exportReleaseRedactedPdf(bytes, pages, {
        fillColor,
        watermark: watermark.enabled
          ? { text: watermark.text, opacity: watermark.opacity }
          : null,
      })
      const blob = new Blob([Uint8Array.from(out)], { type: 'application/pdf' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = selectedDoc?.name ? `redacted-${selectedDoc.name}` : 'redacted.pdf'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      console.error('Export failed', e)
      window.alert(e instanceof Error ? e.message : 'Export failed.')
    }
  }, [buildExportPages, fillColor, pdfUrl, selectedDoc?.name, watermark])

  const uploadFailureNotice =
    uploadError !== null ? (
      <div className="mb-4 rounded border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container">
        {uploadError}
      </div>
    ) : null

  const sidebarBulkNotice =
    bulkSidebarNotice !== null ? (
      <div className="mb-4 rounded border border-secondary-container bg-surface-container-low px-4 py-3 text-sm text-on-secondary-container">
        {bulkSidebarNotice}
      </div>
    ) : null

  const mainNoticeCombined: ReactNode =
    bulkSidebarNotice === null && uploadError === null ? null : (
      <>
        {uploadFailureNotice}
        {sidebarBulkNotice}
      </>
    )

  const rightPanel = useMemo(() => {
    switch (route) {
      case 'workspace':
        return (
          <WorkspaceRightPanel
            currentUserEmail={userEmail}
            allocation={workspaceAllocation}
            collaborators={collaborators}
            draftBoxes={overlayBoxes}
            onLockBox={convexReady ? onLockBox : undefined}
            onDeleteBox={convexReady ? onDeleteBox : undefined}
          />
        )
      case 'dashboard':
        return (
          <SimpleRightPanel
            title="Dashboard"
            description="Document and redaction summaries come from Convex. Use the table to open a file in Workspace."
          />
        )
      case 'conflicts':
        return (
          <SimpleRightPanel
            title="Draft review"
            description="Draft redaction boxes need to be finalized in Workspace — lock yours or adjust before export."
          />
        )
      case 'annotations':
        return (
          <SimpleRightPanel
            title="Audit log"
            description="Recent redaction box events are listed in the main area from your Convex-backed activity feed."
          />
        )
      case 'batch':
        return (
          <SimpleRightPanel
            title="Summary"
            description="Totals and the queue mirror your accessible documents from Convex."
          />
        )
      case 'team':
        return (
          <SimpleRightPanel
            title="Teams"
            description="Shared teams hold collaborative matters per case. Sidebar uploads attach to whichever matter row is selected."
          />
        )
      case 'cases':
        return (
          <SimpleRightPanel
            title="Cases"
            description="Browse matters across teams—or create a collaborative team plus its first substantive matter."
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
            description="Profile name, theme, session details, and Convex status live in the main area."
          />
        )
      default:
        return null
    }
  }, [route, userEmail, workspaceAllocation, collaborators, overlayBoxes, convexReady, onLockBox, onDeleteBox])

  const mainContent = useMemo(() => {
    switch (route) {
      case 'workspace':
        return (
          <WorkspacePage
            pdfUrl={pdfUrl}
            boxes={overlayBoxes}
            onCreateBox={convexReady && documentId ? onCreateBox : undefined}
            onUpdateExemption={convexReady && documentId ? onUpdateExemption : undefined}
            onMoveBox={convexReady && documentId ? onMoveBox : undefined}
            onDeleteBox={convexReady && documentId ? onDeleteBox : undefined}
            canPersist={Boolean(convexReady && documentId)}
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
        return (
          <DashboardPage sessionToken={sessionToken} onOpenDocument={selectConvexDoc} />
        )
      case 'conflicts':
        return (
          <ConflictsPage sessionToken={sessionToken} onOpenDocument={selectConvexDoc} />
        )
      case 'annotations':
        return <AnnotationsPage sessionToken={sessionToken} />
      case 'batch':
        return <BatchPage sessionToken={sessionToken} onOpenDocument={selectConvexDoc} />
      case 'cases':
        return (
          <CasesPage
            convexReady={convexReady}
            teamsPayload={teamsPayload}
            activeCaseId={activeCaseId}
            onOpenCase={(caseId) => void openCaseWorkspace(caseId)}
            onCreateCase={(payload) => void createCaseWithDetails(payload)}
            wizardNonce={caseWizardNonce}
            wizardHandledNonce={caseWizardHandledNonce}
            onWizardConsumedNonce={(nonce) => setCaseWizardHandledNonce(nonce)}
            onDeleteCase={(caseIdDel) => void onDeleteCaseMatter(caseIdDel)}
          />
        )
      case 'team':
        return (
          <TeamsPage
            convexReady={convexReady}
            userEmail={userEmail}
            teamsPayload={teamsPayload}
            activeCaseId={activeCaseId}
            onSelectCase={(caseIdSel) => void setCaseScope(caseIdSel)}
            newCollaborativeTeamName={newCollaborativeTeamName}
            onNewCollaborativeTeamNameChange={setNewCollaborativeTeamName}
            onCreateCollaborativeTeamSubmit={onCreateCollaborativeTeamSubmit}
            activeTeamForMembersId={activeTeamIdForMembers}
            membersForActiveTeam={membersForActiveTeam}
            isTeamAdmin={isTeamAdmin}
            addMemberEmail={addMemberEmail}
            onAddMemberEmailChange={setAddMemberEmail}
            onAddMember={onAddMember}
            memberFeedback={memberFeedback}
            onRemoveMember={(targetEmail) => {
              if (!activeTeamIdForMembers) return
              void removeMember({
                teamId: activeTeamIdForMembers,
                targetEmail,
                sessionToken,
              })
            }}
            onDeleteTeam={
              activeTeamIdForMembers &&
              teamsWithCases?.some(
                (tw) =>
                  tw.team._id === activeTeamIdForMembers &&
                  tw.team.kind === 'collab' &&
                  tw.role === 'admin',
              )
                ? () => void onDeleteCollaborativeTeam(activeTeamIdForMembers)
                : undefined
            }
          />
        )
      case 'archive':
        return (
          <div className="mx-auto max-w-xl py-16 text-center">
            <h2 className="text-lg font-semibold text-on-surface">Archive</h2>
            <p className="mt-2 text-sm text-on-surface-variant">No archive workflow is configured in this app yet.</p>
          </div>
        )
      case 'settings':
        return (
          <SettingsPage
            userEmail={userEmail}
            displayName={displayName}
            sessionExpiresAt={session.expiresAt}
            sessionToken={sessionToken}
          />
        )
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
    onUpdateExemption,
    onMoveBox,
    onDeleteBox,
    activeCaseId,
    activeTeamIdForMembers,
    teamsPayload,
    teamsWithCases,
    activeCaseMeta,
    membersForActiveTeam,
    isTeamAdmin,
    userEmail,
    displayName,
    session.expiresAt,
    newCollaborativeTeamName,
    addMemberEmail,
    memberFeedback,
    sessionToken,
    onCreateCollaborativeTeamSubmit,
    onAddMember,
    removeMember,
    setCaseScope,
    selectConvexDoc,
    openCaseWorkspace,
    createCaseWithDetails,
    onDeleteCaseMatter,
    onDeleteCollaborativeTeam,
    caseWizardNonce,
    caseWizardHandledNonce,
    setCaseWizardHandledNonce,
    convex,
    createCollaborativeTeam,
  ])

  return (
    <AppShell
      route={route}
      onNavigate={setRoute}
      rightPanel={rightPanel}
      documents={sidebarDocuments}
      activeDocumentId={documentId}
      onSelectDocument={(id) => void selectConvexDoc(id)}
      onRenameDocument={convexReady ? onRenameDocument : undefined}
      onDeleteDocument={convexReady ? onDeleteDocument : undefined}
      draftCount={draftCount}
      onExport={pdfUrl ? onExport : undefined}
      exportDisabled={!pdfUrl}
      onTopBarSettingsClick={() => setRoute('settings')}
      onProfileClick={() => setRoute('settings')}
      userInitials={initialsFromDisplayOrEmail(displayName, userEmail)}
      mainNotice={mainNoticeCombined}
      onNavigateToCases={() => setRoute('cases')}
      onNavigateToCreateCase={() => {
        setRoute('cases')
        setCaseWizardNonce((n) => n + 1)
      }}
      thumbnailsCasePanelActive={thumbnailsCasePanelActive}
      thumbnailsCaseName={workspaceTitle}
      thumbnailsPdfSectionTitle={thumbnailsScopeUi.pdfSectionTitle}
      thumbnailsScopeKindLabel={thumbnailsScopeUi.scopeKindLabel}
      thumbnailsAllocatedTeamName={thumbnailsScopeUi.allocatedTeamName}
      onAddThumbnailsDocument={() => thumbnailsInputRef.current?.click()}
      thumbnailsAddDocumentBusy={bulkSidebarBusy}
      thumbnailsAddDocumentDisabled={bulkSidebarBusy}
    >
      <input
        ref={thumbnailsInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const input = e.currentTarget
          void onSidebarBulkPdfFiles(input.files, () => {
            input.value = ''
          })
        }}
      />
      {mainContent}
    </AppShell>
  )
}

function App() {
  const convexReady = isConvexConfigured()
  const token = typeof window !== 'undefined' ? getStoredSessionToken() : null

  if (!convexReady) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
        <IronCladLogo imgClassName="max-h-[52px]" />
        <p className="max-w-md text-center text-sm text-amber-800 dark:text-amber-200/90">
          Set <code className="rounded bg-amber-50 px-1">VITE_CONVEX_URL</code> in{' '}
          <code className="rounded bg-amber-50 px-1">.env.local</code> and run{' '}
          <code className="rounded bg-amber-50 px-1">npx convex dev</code>.
        </p>
        {token ? (
          <button
            type="button"
            className="text-sm underline text-zinc-600"
            onClick={() => {
              clearStoredSessionToken()
              window.location.reload()
            }}
          >
            Clear stored session and retry
          </button>
        ) : null}
      </div>
    )
  }

  if (!token) {
    return <EmailGate />
  }

  return <AuthenticatedApp sessionToken={token} />
}

export default App
