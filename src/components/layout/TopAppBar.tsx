import type { TopNavId } from '../../navigation/routes'
import { Icon } from '../ui/Icon'

type Props = {
  activeNav: TopNavId | null
  onNavClick: (nav: TopNavId) => void
  onExportClick?: () => void
  onShareClick?: () => void
}

const TOP_LINKS: { id: TopNavId; label: string }[] = [
  { id: 'documents', label: 'Documents' },
  { id: 'team', label: 'Teams' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'archive', label: 'Archive' },
]

export function TopAppBar({ activeNav, onNavClick, onExportClick, onShareClick }: Props) {
  const navClass = (key: TopNavId) =>
    key === activeNav
      ? 'text-secondary border-b-2 border-secondary pb-1 font-semibold'
      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low px-2 py-1 rounded transition-colors'

  return (
    <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b border-outline-variant bg-surface px-margin">
      <div className="flex items-center gap-6">
        <span className="text-2xl font-bold tracking-tight text-on-surface">Iron Clad</span>
        <nav className="hidden items-center gap-4 md:flex">
          {TOP_LINKS.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => onNavClick(id)} className={`text-sm ${navClass(id)}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded border border-outline-variant bg-surface-container-low px-3 py-1 lg:flex">
          <Icon name="search" className="text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search case law..."
            className="w-48 border-none bg-transparent text-sm focus:outline-none focus:ring-0"
          />
        </div>
        <button
          type="button"
          onClick={onExportClick}
          className="rounded border border-primary bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary transition-all hover:opacity-90 active:scale-95"
        >
          Export Case
        </button>
        <button
          type="button"
          onClick={onShareClick}
          className="rounded border border-secondary bg-transparent px-4 py-1.5 text-xs font-semibold text-secondary transition-all hover:bg-surface-container-high active:scale-95"
        >
          Share
        </button>
        <div className="ml-2 flex gap-1">
          <button type="button" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="History">
            <Icon name="history" />
          </button>
          <button type="button" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Settings">
            <Icon name="settings" />
          </button>
        </div>
        <span className="ml-2 flex size-8 items-center justify-center rounded-full border border-outline-variant bg-secondary-container text-xs font-bold text-on-secondary-container">
          IC
        </span>
      </div>
    </header>
  )
}
