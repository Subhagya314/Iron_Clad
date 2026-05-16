import type { TopNavId } from '../../navigation/routes'
import { IronCladLogo } from '../branding/IronCladLogo'
import { ExportCaseMenu } from './ExportCaseMenu'
import { Icon } from '../ui/Icon'

type Props = {
  activeNav: TopNavId | null
  onNavClick: (nav: TopNavId) => void
  onExport?: () => void
  exportDisabled?: boolean
  onSettingsClick?: () => void
  /** Avatar opens profile / account settings (same route as sidebar settings). */
  onProfileClick?: () => void
  userInitials: string
}

const TOP_LINKS: { id: TopNavId; label: string }[] = [
  { id: 'documents', label: 'Documents' },
  { id: 'team', label: 'Teams' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'archive', label: 'Archive' },
]

export function TopAppBar({
  activeNav,
  onNavClick,
  onExport,
  exportDisabled,
  onSettingsClick,
  onProfileClick,
  userInitials,
}: Props) {
  const navClass = (key: TopNavId) =>
    key === activeNav
      ? 'text-secondary border-b-2 border-secondary pb-1 font-semibold'
      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low px-2 py-1 rounded transition-colors'

  const initialsBadge = userInitials.trim().slice(0, 2).toUpperCase() || '?'

  return (
    <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b border-outline-variant bg-surface px-margin">
      <div className="flex items-center gap-6">
        <IronCladLogo />
        <nav className="hidden items-center gap-4 md:flex">
          {TOP_LINKS.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => onNavClick(id)} className={`text-sm ${navClass(id)}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {onExport ? (
          <ExportCaseMenu disabled={exportDisabled} onExport={onExport} />
        ) : null}
        {onSettingsClick ? (
          <button
            type="button"
            onClick={onSettingsClick}
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high"
            aria-label="Open settings"
          >
            <Icon name="settings" />
          </button>
        ) : null}
        {onProfileClick ? (
          <button
            type="button"
            onClick={onProfileClick}
            className="ml-1 flex size-8 cursor-pointer items-center justify-center rounded-full border border-outline-variant bg-secondary-container text-[10px] font-bold text-on-secondary-container transition-colors hover:bg-secondary-container/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            aria-label="Open profile and settings"
          >
            {initialsBadge}
          </button>
        ) : (
          <span
            className="ml-1 flex size-8 items-center justify-center rounded-full border border-outline-variant bg-secondary-container text-[10px] font-bold text-on-secondary-container"
            aria-hidden
          >
            {initialsBadge}
          </span>
        )}
      </div>
    </header>
  )
}
