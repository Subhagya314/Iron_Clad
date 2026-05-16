import { useState } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import type { SideNavId } from '../../navigation/routes'
import { useTheme } from '../../lib/theme'
import { Icon } from '../ui/Icon'

type DocumentRow = {
  _id: Id<'documents'>
  name: string
  createdAt: number
}

type Props = {
  activeSideNav: SideNavId | null
  onSideNavClick: (nav: SideNavId) => void
  documents?: DocumentRow[]
  activeDocumentId: Id<'documents'> | null
  onSelectDocument: (id: Id<'documents'>) => void
  onRenameDocument?: (id: Id<'documents'>, name: string) => void
  onDeleteDocument?: (id: Id<'documents'>) => void
  draftCount?: number
  /** Browse all cases (cases list). */
  onNavigateToCases?: () => void
  /** Open cases and start the new-case flow. */
  onNavigateToCreateCase?: () => void
  /** Scoped team workspace: sidebar lists group PDFs and multi-upload. */
  thumbnailsCasePanelActive?: boolean
  thumbnailsCaseName?: string
  thumbnailsPdfSectionTitle?: string
  thumbnailsScopeKindLabel?: string
  /** Team whose roster was used for this case (shown under case name). */
  thumbnailsAllocatedTeamName?: string | null
  onAddThumbnailsDocument?: () => void
  thumbnailsAddDocumentBusy?: boolean
  thumbnailsAddDocumentDisabled?: boolean
}

function DarkModeFooterButton() {
  const { isDark, toggleDarkMode } = useTheme()
  return (
    <button
      type="button"
      aria-pressed={isDark}
      onClick={toggleDarkMode}
      className="flex w-full items-center gap-3 rounded px-3 py-2 text-on-surface-variant hover:bg-surface-container-high"
    >
      <Icon name={isDark ? 'light_mode' : 'dark_mode'} />
      <span className="text-xs font-semibold">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}

const SIDE_ITEMS: { id: SideNavId; icon: string; label: string; iconClass?: string }[] = [
  { id: 'thumbnails', icon: 'grid_view', label: 'Thumbnails' },
  { id: 'annotations', icon: 'edit_square', label: 'Annotations' },
  { id: 'conflicts', icon: 'warning', label: 'Conflicts', iconClass: 'text-error' },
  { id: 'settings', icon: 'settings_applications', label: 'Settings' },
]

export function LeftSidebar({
  activeSideNav,
  onSideNavClick,
  documents,
  activeDocumentId,
  onSelectDocument,
  onRenameDocument,
  onDeleteDocument,
  draftCount = 0,
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
  const [renamingId, setRenamingId] = useState<Id<'documents'> | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const startRename = (doc: DocumentRow) => {
    setRenamingId(doc._id)
    setRenameValue(doc.name)
  }

  const commitRename = (id: Id<'documents'>) => {
    const trimmed = renameValue.trim()
    if (trimmed && onRenameDocument) onRenameDocument(id, trimmed)
    setRenamingId(null)
    setRenameValue('')
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-surface-bright">
      <div className="space-y-2 border-b border-outline-variant p-4">
        <button
          type="button"
          onClick={() => onNavigateToCases?.()}
          disabled={!onNavigateToCases}
          className="flex w-full items-center justify-center gap-2 rounded bg-surface-container-low px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
          aria-label="Cases"
        >
          <Icon name="folder" size={18} aria-hidden />
          Cases
        </button>
        <button
          type="button"
          onClick={() => onNavigateToCreateCase?.()}
          disabled={!onNavigateToCreateCase}
          className="flex w-full items-center justify-center gap-2 rounded bg-secondary px-4 py-2.5 text-xs font-semibold text-on-secondary transition-all hover:opacity-90 disabled:opacity-40"
          aria-label="Add new case"
        >
          <Icon name="add" size={18} aria-hidden />
          Add Case
        </button>
      </div>

      <nav className="flex-1 py-2">
        <ul className="space-y-1 px-2">
          {SIDE_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSideNavClick(item.id)}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-all ${
                  activeSideNav === item.id
                    ? 'bg-secondary-container font-semibold text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Icon name={item.icon} className={item.iconClass} />
                <span className="text-xs font-semibold">{item.label}</span>
                {item.id === 'conflicts' && draftCount > 0 && (
                  <span className="ml-auto rounded-full bg-error px-1.5 py-0.5 text-[10px] text-on-error">
                    {draftCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {thumbnailsCasePanelActive && (
          <div className="mt-4 border-t border-outline-variant px-3 pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              {thumbnailsPdfSectionTitle}
            </p>
            {thumbnailsCaseName ? (
              <div className="mb-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  {thumbnailsScopeKindLabel}
                </p>
                <p
                  className="truncate text-xs font-semibold text-on-surface"
                  title={thumbnailsCaseName}
                >
                  {thumbnailsCaseName}
                </p>
                {thumbnailsAllocatedTeamName ? (
                  <>
                    <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                      Team roster
                    </p>
                    <p
                      className="truncate text-xs font-medium text-on-surface"
                      title={thumbnailsAllocatedTeamName}
                    >
                      {thumbnailsAllocatedTeamName}
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onAddThumbnailsDocument}
              disabled={
                thumbnailsAddDocumentDisabled ??
                thumbnailsAddDocumentBusy ??
                !onAddThumbnailsDocument
              }
              className="mb-3 flex w-full items-center justify-center gap-2 rounded border border-dashed border-outline-variant py-2 text-[11px] font-semibold text-secondary transition-colors hover:border-secondary hover:bg-surface-container-low disabled:opacity-50"
            >
              <Icon name="upload_file" size={16} />
              {thumbnailsAddDocumentBusy ? 'Uploading PDFs…' : 'Add multiple PDFs…'}
            </button>
            {documents && documents.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant">No PDFs in this case yet.</p>
            ) : null}
            <ul className="space-y-1">
              {(documents ?? []).map((doc) => (
                <li key={doc._id}>
                  {renamingId === doc._id ? (
                    <input
                      type="text"
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(doc._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(doc._id)
                        if (e.key === 'Escape') {
                          setRenamingId(null)
                          setRenameValue('')
                        }
                      }}
                      className="w-full rounded border border-outline-variant bg-surface px-2 py-1 text-xs"
                    />
                  ) : (
                    <div
                      className={`group flex items-center gap-1 rounded px-1 py-0.5 ${
                        activeDocumentId === doc._id ? 'bg-secondary-container' : 'hover:bg-surface-container-high'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectDocument(doc._id)}
                        className={`min-w-0 flex-1 truncate py-1 text-left text-xs ${
                          activeDocumentId === doc._id
                            ? 'font-semibold text-on-secondary-container'
                            : 'text-on-surface-variant'
                        }`}
                        title={doc.name}
                      >
                        {doc.name}
                      </button>
                      {onRenameDocument && (
                        <button
                          type="button"
                          title="Rename document"
                          aria-label={`Rename ${doc.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            startRename(doc)
                          }}
                          className="rounded p-1 text-on-surface-variant opacity-0 transition-opacity hover:bg-surface-container-high group-hover:opacity-100"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                      )}
                      {onDeleteDocument && (
                        <button
                          type="button"
                          title="Delete document"
                          aria-label={`Delete ${doc.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
                              onDeleteDocument(doc._id)
                            }
                          }}
                          className="rounded p-1 text-error opacity-0 transition-opacity hover:bg-error-container group-hover:opacity-100"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!thumbnailsCasePanelActive && documents && documents.length > 0 && (
          <div className="mt-4 border-t border-outline-variant px-3 pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Case files
            </p>
            <ul className="space-y-1">
              {documents.map((doc) => (
                <li key={doc._id}>
                  {renamingId === doc._id ? (
                    <input
                      type="text"
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(doc._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(doc._id)
                        if (e.key === 'Escape') {
                          setRenamingId(null)
                          setRenameValue('')
                        }
                      }}
                      className="w-full rounded border border-outline-variant bg-surface px-2 py-1 text-xs"
                    />
                  ) : (
                    <div
                      className={`group flex items-center gap-1 rounded px-1 py-0.5 ${
                        activeDocumentId === doc._id ? 'bg-secondary-container' : 'hover:bg-surface-container-high'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectDocument(doc._id)}
                        className={`min-w-0 flex-1 truncate py-1 text-left text-xs ${
                          activeDocumentId === doc._id
                            ? 'font-semibold text-on-secondary-container'
                            : 'text-on-surface-variant'
                        }`}
                        title={doc.name}
                      >
                        {doc.name}
                      </button>
                      {onRenameDocument && (
                        <button
                          type="button"
                          title="Rename document"
                          aria-label={`Rename ${doc.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            startRename(doc)
                          }}
                          className="rounded p-1 text-on-surface-variant opacity-0 transition-opacity hover:bg-surface-container-high group-hover:opacity-100"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                      )}
                      {onDeleteDocument && (
                        <button
                          type="button"
                          title="Delete document"
                          aria-label={`Delete ${doc.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
                              onDeleteDocument(doc._id)
                            }
                          }}
                          className="rounded p-1 text-error opacity-0 transition-opacity hover:bg-error-container group-hover:opacity-100"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="border-t border-outline-variant bg-surface-container-low p-2">
        <DarkModeFooterButton />
      </div>
    </aside>
  )
}
