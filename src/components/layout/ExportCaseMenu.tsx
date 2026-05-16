import { Icon } from '../ui/Icon'

type Props = {
  onExport: () => void
  disabled?: boolean
}

export function ExportCaseMenu({ onExport, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      title="Export redacted PDF — marked pages become images; other pages stay selectable"
      onClick={onExport}
      className="flex items-center gap-1 rounded border border-primary bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
    >
      <Icon name="download" size={16} aria-hidden />
      Export
    </button>
  )
}
