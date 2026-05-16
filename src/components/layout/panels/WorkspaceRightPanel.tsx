import type { OverlayBox } from '../../pdf-viewer/RedactionOverlay'
import { CollaboratorList } from '../../presence/CollaboratorList'

type Collaborator = { userId: string; displayName?: string; color?: string }

type EditorRow = { userId: string; role: 'admin' | 'member' }

export type WorkspaceAllocation =
  | { kind: 'none' }
  | { kind: 'loading' }
  | {
      kind: 'ready'
      context: { label: string; name: string; sourceTeamName?: string }
      editors: EditorRow[]
    }

type Props = {
  currentUserEmail: string
  allocation: WorkspaceAllocation
  collaborators: Collaborator[]
  draftBoxes: OverlayBox[]
  onLockBox?: (boxId: string) => void
  onDeleteBox?: (boxId: string) => void
}

function editorSortKey(a: EditorRow, b: EditorRow) {
  if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
  return a.userId.localeCompare(b.userId)
}

export function WorkspaceRightPanel({
  currentUserEmail,
  allocation,
  collaborators,
  draftBoxes,
  onLockBox,
  onDeleteBox,
}: Props) {
  const pending = draftBoxes.filter((b) => b.status === 'draft')
  const selfNorm = currentUserEmail.trim().toLowerCase()

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-surface-bright">
      <div className="border-b border-outline-variant p-4">
        <h3 className="text-base font-semibold">Allocated for editing</h3>
        {allocation.kind === 'none' ? (
          <p className="mt-1 text-xs text-on-surface-variant">
            Personal workspace: only you can edit until you open or upload under a Team or Case.
          </p>
        ) : allocation.kind === 'loading' ? (
          <p className="mt-1 text-xs text-on-surface-variant">Loading editor list…</p>
        ) : (
          <>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              {allocation.context.label}
            </p>
            <p
              className="mt-0.5 truncate text-sm font-semibold text-on-surface"
              title={allocation.context.name}
            >
              {allocation.context.name}
            </p>
            {allocation.context.sourceTeamName ? (
              <p className="mt-1 text-xs text-on-surface-variant">
                Editors from Team:{' '}
                <span className="font-medium text-on-surface">{allocation.context.sourceTeamName}</span>
              </p>
            ) : null}
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Assigned editors ({allocation.editors.length})
            </p>
            <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
              {[...allocation.editors].sort(editorSortKey).map((m) => {
                const isSelf = m.userId.trim().toLowerCase() === selfNorm
                return (
                  <li
                    key={m.userId}
                    className="flex flex-wrap items-baseline gap-2 rounded-md border border-outline-variant/60 bg-surface-container-low px-2 py-1.5 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-on-surface" title={m.userId}>
                      {m.userId}
                      {isSelf ? (
                        <span className="ml-1.5 align-middle text-[10px] font-normal text-on-surface-variant">
                          (you)
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={
                        m.role === 'admin'
                          ? 'shrink-0 rounded bg-secondary/15 px-1.5 py-0 text-[10px] font-semibold uppercase text-secondary'
                          : 'shrink-0 text-[10px] font-medium uppercase text-on-surface-variant'
                      }
                    >
                      {m.role}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <div className="border-b border-outline-variant px-4 py-3">
        <h4 className="text-sm font-semibold">Presence</h4>
        <p className="mt-1 text-xs text-on-surface-variant">
          {collaborators.length === 0
            ? 'No one else is viewing this document right now.'
            : `${collaborators.length} other ${collaborators.length === 1 ? 'viewer' : 'viewers'} on this PDF (heartbeat).`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          Draft redactions
        </h4>
        {pending.length === 0 ? (
          <p className="text-xs text-on-surface-variant">No draft boxes on the open file.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((box) => (
              <li key={box.id} className="rounded border border-outline-variant bg-surface-container-low p-3">
                <p className="text-xs font-semibold text-on-surface">
                  Draft · Page {box.pageNumber ?? '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!onLockBox}
                    onClick={() => onLockBox?.(box.id)}
                    className="rounded bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-on-secondary disabled:opacity-40"
                  >
                    Lock
                  </button>
                  <button
                    type="button"
                    disabled={!onDeleteBox}
                    onClick={() => onDeleteBox?.(box.id)}
                    className="rounded border border-outline-variant px-2 py-1 text-[10px] font-bold uppercase disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-outline-variant bg-surface-container-low p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase text-on-surface-variant">Here now</h4>
        <CollaboratorList collaborators={collaborators} />
      </div>
    </aside>
  )
}
