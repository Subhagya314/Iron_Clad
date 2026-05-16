type Props = { title: string; description: string }

export function SimpleRightPanel({ title, description }: Props) {
  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-surface-bright p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
    </aside>
  )
}
