import logoSrcUrl from '../../assets/iron-clad-logo.png'

type Props = {
  className?: string
  /** Extra classes on the `<img>` (sizes, positioning). Defaults to bar height (~36px). */
  imgClassName?: string
}

/**
 * Transparent PNG with solid black artwork; inverted in dark mode so it stays visible on dark surfaces.
 */
export function IronCladLogo({ className, imgClassName }: Props) {
  return (
    <span className={`inline-flex shrink-0 items-center ${className ?? ''}`}>
      <img
        src={logoSrcUrl}
        alt="Iron Clad"
        decoding="async"
        className={`h-9 w-auto max-h-11 max-w-[min(100%,280px)] object-contain object-left dark:invert ${imgClassName ?? ''}`}
      />
    </span>
  )
}
