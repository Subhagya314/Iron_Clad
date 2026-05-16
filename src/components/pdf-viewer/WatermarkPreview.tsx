type Props = {
  text: string
  opacity: number
}

export function WatermarkPreview({ text, opacity }: Props) {
  const label = text.trim()
  if (!label) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <span
        className="max-w-[140%] select-none whitespace-nowrap text-center font-bold tracking-wide"
        style={{
          color: `rgba(100, 110, 125, ${opacity})`,
          fontSize: 'clamp(1.25rem, 10vmin, 3.5rem)',
          transform: 'rotate(-45deg)',
        }}
      >
        {label}
      </span>
    </div>
  )
}
