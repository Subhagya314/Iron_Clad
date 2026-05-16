import type { ReactNode } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import type { AppRoute } from '../../navigation/routes'
import { SIDE_NAV_ROUTES, TOP_NAV_ROUTES, sideNavForRoute, topNavForRoute } from '../../navigation/routes'
import { usePersistedPanelWidths } from '../../lib/usePersistedPanelWidths'
import { LeftSidebar } from './LeftSidebar'
import { PanelResizeHandle } from './PanelResizeHandle'
import { TopAppBar } from './TopAppBar'
import type { TopNavId, SideNavId } from '../../navigation/routes'

type DocumentRow = { _id: Id<'documents'>; name: string; createdAt: number }

type Props = {
  route: AppRoute
  onNavigate: (route: AppRoute) => void
  rightPanel: ReactNode
  children: ReactNode
  documents?: DocumentRow[]
  activeDocumentId: Id<'documents'> | null
  onSelectDocument: (id: Id<'documents'>) => void
  onRenameDocument?: (id: Id<'documents'>, name: string) => void
  onDeleteDocument?: (id: Id<'documents'>) => void
  draftCount?: number
  onExport?: () => void
  exportDisabled?: boolean
  onTopBarSettingsClick?: () => void
  /** Profile avatar opens the same settings area. */
  onProfileClick?: () => void
  userInitials: string
  mainNotice?: ReactNode
  onNavigateToCases?: () => void
  onNavigateToCreateCase?: () => void
  thumbnailsCasePanelActive?: boolean
  thumbnailsCaseName?: string
  thumbnailsPdfSectionTitle?: string
  thumbnailsScopeKindLabel?: string
  /** When the active scope is a case created from a Team roster. */
  thumbnailsAllocatedTeamName?: string | null
  onAddThumbnailsDocument?: () => void
  thumbnailsAddDocumentBusy?: boolean
  thumbnailsAddDocumentDisabled?: boolean
}

export function AppShell({
  route,
  onNavigate,
  rightPanel,
  children,
  documents,
  activeDocumentId,
  onSelectDocument,
  onRenameDocument,
  onDeleteDocument,
  draftCount,
  onExport,
  exportDisabled,
  onTopBarSettingsClick,
  onProfileClick,
  userInitials,
  mainNotice,
  onNavigateToCases,
  onNavigateToCreateCase,
  thumbnailsCasePanelActive = false,
  thumbnailsCaseName,
  thumbnailsPdfSectionTitle = 'Shared PDFs',
  thumbnailsScopeKindLabel = 'Workspace',
  thumbnailsAllocatedTeamName,
  onAddThumbnailsDocument,
  thumbnailsAddDocumentBusy,
  thumbnailsAddDocumentDisabled,
}: Props) {
  const activeTopNav = topNavForRoute(route)
  const activeSideNav = sideNavForRoute(route)
  const { leftWidth, rightWidth, resizeLeft, resizeRight, resetLeft, resetRight } =
    usePersistedPanelWidths()

  const handleTopNav = (nav: TopNavId) => onNavigate(TOP_NAV_ROUTES[nav])
  const handleSideNav = (nav: SideNavId) => onNavigate(SIDE_NAV_ROUTES[nav])
  const showRightPanel = Boolean(rightPanel)

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopAppBar
        activeNav={activeTopNav}
        onNavClick={handleTopNav}
        onExport={onExport}
        exportDisabled={exportDisabled}
        onSettingsClick={onTopBarSettingsClick}
        onProfileClick={onProfileClick}
        userInitials={userInitials}
      />
      <div className="fixed inset-x-0 bottom-0 top-14 flex">
        <div
          className="relative h-full shrink-0 overflow-hidden border-r border-outline-variant"
          style={{ width: leftWidth }}
        >
          <LeftSidebar
            activeSideNav={activeSideNav}
            onSideNavClick={handleSideNav}
            documents={documents}
            activeDocumentId={activeDocumentId}
            onSelectDocument={onSelectDocument}
            onRenameDocument={onRenameDocument}
            onDeleteDocument={onDeleteDocument}
            draftCount={draftCount}
            onNavigateToCases={onNavigateToCases}
            onNavigateToCreateCase={onNavigateToCreateCase}
            thumbnailsCasePanelActive={thumbnailsCasePanelActive}
            thumbnailsCaseName={thumbnailsCaseName}
            thumbnailsPdfSectionTitle={thumbnailsPdfSectionTitle}
            thumbnailsScopeKindLabel={thumbnailsScopeKindLabel}
            thumbnailsAllocatedTeamName={thumbnailsAllocatedTeamName}
            onAddThumbnailsDocument={onAddThumbnailsDocument}
            thumbnailsAddDocumentBusy={thumbnailsAddDocumentBusy}
            thumbnailsAddDocumentDisabled={thumbnailsAddDocumentDisabled}
          />
          <PanelResizeHandle
            edge="inner-end"
            label="Resize left sidebar"
            onResize={resizeLeft}
            onReset={resetLeft}
          />
        </div>

        <main className="min-w-0 flex-1 overflow-auto bg-surface-dim p-gutter">
          {mainNotice}
          {children}
        </main>

        {showRightPanel ? (
          <div
            className="relative h-full shrink-0 overflow-hidden border-l border-outline-variant"
            style={{ width: rightWidth }}
          >
            <PanelResizeHandle
              edge="inner-start"
              label="Resize right panel"
              onResize={resizeRight}
              onReset={resetRight}
            />
            <div className="h-full w-full overflow-hidden">{rightPanel}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
