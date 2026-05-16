import { Icon } from '../ui/Icon'

export function RedactionGuidance() {
  return (
    <details className="mb-4 rounded border border-outline-variant bg-surface-container-low text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 font-semibold text-on-surface">
        <Icon name="info" size={18} className="text-secondary" />
        How redaction works in Iron Clad
      </summary>
      <div className="space-y-3 border-t border-outline-variant px-4 py-3 text-on-surface-variant">
        <p>
          <strong className="text-on-surface">Review here (PDF).</strong> Mark regions on the PDF;
          coordinates are stored relative to the page viewport so boxes stay aligned when you zoom.
        </p>
        <p>
          <strong className="text-on-surface">Office sources.</strong> If the original was Word,
          run Inspect Document and replace confidential text with placeholders such as{' '}
          <code className="rounded bg-surface px-1">[Redacted]</code> before converting to PDF —
          that step is not done inside this app.
        </p>
        <p>
          <strong className="text-on-surface">Export</strong> turns any page that has redaction boxes
          into a single image (text is burned in — it cannot be copied). Pages you did not mark up
          stay normal, selectable PDF. Choose fill color in the toolbar; optional watermark in
          Settings.
        </p>
        <p className="text-xs">
          Boxes extend slightly below your selection so lines are fully covered.
        </p>
        <p className="text-xs">
          Browser Ctrl+A does not perform secure redaction; use Marquee or Select text tools to mark
          regions deliberately.
        </p>
      </div>
    </details>
  )
}
