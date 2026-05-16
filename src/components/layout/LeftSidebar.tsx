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
  onAddDocument: () => void
  uploading?: boolean
  draftCount?: number
  /** Shown in the case header (e.g. team name or "Personal workspace"). */
  workspaceTitle: string
  workspaceSubtitle?: string
  /** Short label in the badge (e.g. doc count or initials). */
  badgeLabel: string
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
  { id: 'outline', icon: 'format_list_bulleted', label: 'Outline' },
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
  onAddDocument,
  uploading,
  draftCount = 0,
  workspaceTitle,
  workspaceSubtitle = 'Workspace',
  badgeLabel,
}: Props) {
  return (
    <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col overflow-y-auto border-r border-outline-variant bg-surface-bright">
      <div className="border-b border-outline-variant p-4">
        <div className="mb-1 flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded border border-outline bg-primary-container text-[10px] font-bold text-on-primary">
            {badgeLabel.slice(0, 3)}
          </span>
          <div>
            <p className="text-sm font-bold leading-none">{workspaceTitle}</p>
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">{workspaceSubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddDocument}
          disabled={uploading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-secondary py-2 text-xs font-semibold text-on-secondary transition-all hover:opacity-90 disabled:opacity-60"
        >
          <Icon name="add" size={18} />
          {uploading ? 'Uploading…' : 'Add Document'}
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

        {documents && documents.length > 0 && (
          <div className="mt-4 border-t border-outline-variant px-3 pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Case files</p>
            <ul className="space-y-1">
              {documents.map((doc) => (
                <li key={doc._id}>
                  <button
                    type="button"
                    onClick={() => onSelectDocument(doc._id)}
                    className={`w-full truncate rounded px-2 py-1.5 text-left text-xs transition-colors ${
                      activeDocumentId === doc._id
                        ? 'bg-secondary-container font-semibold text-on-secondary-container'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {doc.name}
                  </button>
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
