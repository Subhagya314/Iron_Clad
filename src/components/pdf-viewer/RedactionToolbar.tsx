import { Icon } from '../ui/Icon'

export type RedactionToolMode = 'marquee' | 'select-text' | 'move'

type ToolButtonProps = {
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}

function ToolButton({ icon, label, active, disabled, danger, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-primary text-on-primary'
          : danger
            ? 'text-error hover:bg-error-container'
            : 'text-on-surface-variant hover:bg-surface-container-low'
      }`}
    >
      <Icon name={icon} size={20} />
    </button>
  )
}

type Props = {
  mode: RedactionToolMode
  onModeChange: (mode: RedactionToolMode) => void
  canDraw: boolean
  hasSelectedBox: boolean
  onDelete?: () => void
  fillColor: string
  onFillColorChange: (color: string) => void
}

const FILL_PRESETS = ['#000000', '#1e293b', '#1e3a5f', '#3f3f46'] as const

export function RedactionToolbar({
  mode,
  onModeChange,
  canDraw,
  hasSelectedBox,
  onDelete,
  fillColor,
  onFillColorChange,
}: Props) {
  if (!canDraw) return null

  return (
    <div
      className="flex max-w-full shrink-0 flex-wrap items-center gap-0.5 rounded-md border border-outline-variant bg-surface p-0.5 sm:flex-nowrap"
      role="toolbar"
      aria-label="Redaction tools"
    >
      <ToolButton
        icon="crop_free"
        label="Marquee — drag to draw a redaction box"
        active={mode === 'marquee'}
        onClick={() => onModeChange('marquee')}
      />
      <ToolButton
        icon="text_fields"
        label="Select text — drag over text to redact"
        active={mode === 'select-text'}
        onClick={() => onModeChange('select-text')}
      />
      <ToolButton
        icon="open_with"
        label="Move — drag a selected box to reposition"
        active={mode === 'move'}
        onClick={() => onModeChange('move')}
      />
      <span className="mx-0.5 h-6 w-px bg-outline-variant" aria-hidden />
      <label
        className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-on-surface-variant"
        title="Redaction fill color (locked boxes and export)"
      >
        <span className="sr-only">Redaction color</span>
        <Icon name="format_color_fill" size={18} aria-hidden />
        <input
          type="color"
          value={fillColor}
          onChange={(e) => onFillColorChange(e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border border-outline-variant bg-surface p-0.5"
          aria-label="Pick redaction fill color"
        />
      </label>
      <div className="hidden items-center gap-0.5 sm:flex">
        {FILL_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            title={`Use ${preset}`}
            onClick={() => onFillColorChange(preset)}
            className={`size-5 rounded border ${
              fillColor.toLowerCase() === preset ? 'ring-2 ring-primary ring-offset-1' : 'border-outline-variant'
            }`}
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>
      <span className="mx-0.5 h-6 w-px bg-outline-variant" aria-hidden />
      <ToolButton
        icon="delete"
        label="Delete selected box"
        disabled={!hasSelectedBox || !onDelete}
        danger
        onClick={() => onDelete?.()}
      />
    </div>
  )
}
